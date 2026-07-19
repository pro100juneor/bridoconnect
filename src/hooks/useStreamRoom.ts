import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";
import { supabase } from "@/integrations/supabase/client";

// Real WebRTC room lifecycle for live streams (LiveKit Cloud).
// Host publishes camera+mic; viewers subscribe. Chat + donation events travel
// over LiveKit's reliable data channel (create-stream-token grants canPublishData),
// so no extra DB table is needed for ephemeral stream chat.

export type StreamChatMsg = {
  id: string;
  user: string;
  text: string;
  isDonation: boolean;
};

type RoomStatus = "idle" | "connecting" | "live" | "error";

async function mintToken(roomName: string, isHost: boolean) {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/create-stream-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ room_name: roomName, is_host: isHost }),
  });
  if (!resp.ok) return null;
  return (await resp.json()) as {
    token: string;
    ws_url: string;
    room_name: string;
    participant_name: string;
  };
}

export function useStreamRoom(videoRef: React.RefObject<HTMLVideoElement>) {
  const roomRef = useRef<Room | null>(null);
  const [status, setStatus] = useState<RoomStatus>("idle");
  const [participants, setParticipants] = useState(0);
  const [messages, setMessages] = useState<StreamChatMsg[]>([]);

  const syncCount = useCallback((room: Room) => {
    // remote participants + self
    setParticipants(room.remoteParticipants.size + 1);
  }, []);

  const attachRemoteVideo = useCallback(
    (track: RemoteTrack) => {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
      }
    },
    [videoRef]
  );

  const connect = useCallback(
    async (roomName: string, isHost: boolean): Promise<boolean> => {
      if (roomRef.current) return true;
      setStatus("connecting");
      const t = await mintToken(roomName, isHost);
      if (!t || !t.ws_url) {
        setStatus("error");
        return false;
      }

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      room
        .on(RoomEvent.TrackSubscribed, (track) => attachRemoteVideo(track))
        .on(RoomEvent.ParticipantConnected, () => syncCount(room))
        .on(RoomEvent.ParticipantDisconnected, () => syncCount(room))
        .on(RoomEvent.DataReceived, (payload) => {
          try {
            const m = JSON.parse(new TextDecoder().decode(payload)) as StreamChatMsg;
            if (m && typeof m.text === "string") setMessages((prev) => [...prev, m]);
          } catch {
            /* ignore malformed data packets */
          }
        })
        .on(RoomEvent.Disconnected, () => {
          roomRef.current = null;
          setStatus("idle");
        });

      try {
        await room.connect(t.ws_url, t.token);
      } catch {
        roomRef.current = null;
        setStatus("error");
        return false;
      }

      syncCount(room);

      if (isHost) {
        await room.localParticipant.enableCameraAndMicrophone();
        const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
        if (pub?.track && videoRef.current) pub.track.attach(videoRef.current);
      }

      setStatus("live");
      return true;
    },
    [attachRemoteVideo, syncCount, videoRef]
  );

  const sendChat = useCallback(async (user: string, text: string, isDonation = false): Promise<void> => {
    const room = roomRef.current;
    const msg: StreamChatMsg = {
      id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
      user,
      text,
      isDonation,
    };
    // Optimistic local echo
    setMessages((prev) => [...prev, msg]);
    if (!room) return;
    const data = new TextEncoder().encode(JSON.stringify(msg));
    await room.localParticipant.publishData(data, { reliable: true });
  }, []);

  const disconnect = useCallback(async (): Promise<void> => {
    await roomRef.current?.disconnect();
    roomRef.current = null;
    setStatus("idle");
  }, []);

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, []);

  return { connect, disconnect, sendChat, status, participants, messages };
}
