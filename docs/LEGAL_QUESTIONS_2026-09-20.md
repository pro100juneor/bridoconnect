# BridoConnect — детальные вопросы к юристу (Zahlungsaufsichts-/AML-/Steuer-/DSA-/GDPR-Recht)

> Основано на внутреннем правовом анализе от 20.09.2026. Цель — получить **письменную**
> квалификацию по конкретной, зафиксированной архитектуре, а не общую консультацию.
> Специализация нужна: немецкое Zahlungsaufsichtsrecht (ZAG/PSD2) + GwG + Steuerrecht + DSA/GDPR.
> Ко всем вопросам просьба давать ответ в форме: **да / нет / зависит + при каких условиях**, со ссылкой на норму.

---

## 0. Архитектура, которую нужно квалифицировать (отвечать применительно именно к ней)

Просьба дать заключение по СЛЕДУЮЩЕМУ фиксированному flow (не по абстрактной модели):

- Stripe Connect, **Direct Charges**: charge создаётся непосредственно на **Connected Account** получателя/исполнителя.
- Платформа (Brida) получает только заранее раскрытую **5% application fee**.
- Платформа **никогда** не получает principal на свой Stripe-balance; **нет** internal wallet; **нет** user-balance;
  **нет** balance-to-balance переводов; **нет** самостоятельного split после платежа; **нет** возможности сменить
  получателя после оплаты; **нет** собственных payout rails; **нет** currency conversion; **нет** термина/функции escrow.
- Отдельно: коммерческая **GmbH** (платформа, ПО, marketplace, комиссия) и благотворительная **gGmbH** (настоящие пожертвования).

**Вопрос 0.1.** Подтверждаете ли, что при ТАКОЙ архитектуре платформе, вероятно, **не требуется** собственная
лицензия Zahlungsinstitut по ZAG? Какие именно фактические/договорные условия критичны для этого вывода?

**Вопрос 0.2.** Какие конкретные пункты Stripe Connect Agreement и наших AGB должны быть проверены/зафиксированы,
чтобы этот вывод был устойчив перед BaFin?

**Вопрос 0.3.** Готовы ли вы при необходимости представить именно этот flow в BaFin для aufsichtsrechtliche Einordnung?

---

## I. ZAG / PSD2 / BaFin

**1.1.** Подпадает ли наша модель под **Finanztransfergeschäft** (§ 1 Abs. 1 S. 2 Nr. 6 ZAG) при Direct Charges,
если деньги никогда не проходят через баланс платформы?

**1.2.** По каждому из факторов (кто принимает платёж; на чьём account возникает charge; кто payment recipient;
кто определяет и может изменить destination; кто может удержать средства; кто даёт распоряжение на transfer и
определяет его размер; кто инициирует refund; кто несёт chargeback-risk; кто контролирует payout; кто contractual
counterparty плательщика; чью услугу оплачивает payer) — как он должен быть настроен, чтобы НЕ квалифицироваться
как Zahlungsdienst? Есть ли среди них «убийственный» фактор?

**1.3.** Применимо ли к нам исключение **Technical Service Provider** (§ 2 Abs. 1 Nr. 9 ZAG)? Что именно мы
должны и НЕ должны делать, чтобы под него попасть (учитывая, что мы не Zahlungsauslöse-/Kontoinformationsdienst)?

**1.4.** Direct Charges vs Destination Charges vs Separate Charges and Transfers — подтверждаете, что для нас
только **Direct Charges** юридически чист, а Destination требует отдельного ZAG-review, Separate — исключён?

**1.5.** **Manual payout / conditional release:** если получатель — уже юридический получатель средств, а
задержка выплаты идёт по settlement/risk-policy Stripe, это ок? Где грань, после которой «задержка выплаты»
превращается в дискреционный контроль платформы над чужими средствами (и в ZAG-риск)?

**1.6.** **Escrow/Treuhand:** подтверждаете, что нам нельзя реализовывать escrow-подобную логику поверх обычного
Stripe Connect без лицензированного escrow/treuhand-провайдера? Какие есть чистые альтернативы для conditional
payment (сразу-собственность-получателя + refund-logic / safeguarding у PSP / отдельный лицензированный provider)?

**1.7.** **Handelsvertreterausnahme** (§ 2 Abs. 1 Nr. 2 ZAG) — можно ли/стоит ли на неё опираться, если платформа
нейтральна к обеим сторонам? Рекомендуете ли НЕ строить на ней основную защиту?

**1.8.** **Agent Stripe** (§ 1 Abs. 9, § 25 ZAG): не становимся ли мы Agent платёжного института по факту функций
или по Stripe agreement? Что нужно проверить, чтобы это исключить, и нужна ли регистрация?

**1.9.** Какие формулировки в AGB/Impressum обязательны и какие ЗАПРЕЩЕНЫ, чтобы не создавать впечатление
лицензированного платёжного института (пример допустимой формулировки о том, что платежи проводит Stripe)?

---

## II. GwG / AML

**2.1.** Становится ли платформа **Verpflichteter** по § 2 GwG при рекомендованной архитектуре (когда мы НЕ
Zahlungsinstitut и НЕ Agent)? При каких обстоятельствах могли бы стать?

**2.2.** Если мы НЕ Verpflichteter: какие AML-подобные обязанности всё же остаются у нас по договору со Stripe,
DSA, санкционному праву — и что при этом полностью на стороне Stripe?

**2.3.** Если мы всё же Verpflichteter: подтвердите полный минимальный периметр (§ 4 risk management/Risikoanalyse;
§ 10 идентификация Vertragspartner + wirtschaftlich Berechtigter + purpose + PEP + ongoing monitoring; § 43 STR в FIU;
документирование/retention).

**2.4.** Можно ли «передать AML Stripe»? Подтвердите, что при статусе Verpflichteter ответственность остаётся на
нас даже при § 17 GwG (использование третьих лиц) и § 6 Abs. 7 GwG (outsourcing).

**2.5.** **Stripe Identity** и **ComplyAdvantage** — где граница между Identity Verification и полноценной AML-CDD?
Что из CDD (beneficial owner, ownership structure, PEP, EDD, source of funds/wealth, transaction monitoring, FIU-reporting,
audit trail) НЕ покрывается этими инструментами и осталось бы на нас?

**2.6.** Если мы НЕ Verpflichteter, но хотим «AML-подобный» контроль ради риска/доверия — какой минимальный
добросовестный набор рекомендуете, чтобы не создать себе де-факто обязанности?

---

## III. Санкции (отдельный слой)

**3.1.** Применяются ли к нам напрямую запреты ЕС на предоставление денежных средств/экономических ресурсов
санкционным лицам, даже если мы НЕ GwG-Verpflichteter?

**3.2.** Обязателен ли **sanctions screening получателей** (и плательщиков?) как отдельный compliance-layer,
и с какой периодичностью (onboarding + повторный скрининг)? Что документировать?

---

## IV. PStTG / DAC7 (потенциально ключевой закон)

**4.1.** Квалифицируются ли оплачиваемые задачи исполнителей на платформе (ремонт, перевозка, уборка, помощь,
доставка, цифровые/физические задачи) как **persönliche Dienstleistung** по § 5 PStTG?

**4.2.** Подтверждаете ли, что аргумент «исполнителю заплатил не заказчик, а благотворитель» **не исключает** DAC7,
т.к. Vergütung учитывается независимо от того, кто заплатил?

**4.3.** Какие именно **due-diligence и reporting-обязанности** у нас как platform operator возникают
(seller identification: имя, адрес, TIN/Steuer-ID, VAT ID, дата рождения / данные юрлица; residence determination;
данные о вознаграждении и комиссиях; reporting в BZSt)? Сроки и формат?

**4.4.** Применяется ли к «личным услугам» порог «30 транзакций / €2,000» (он для продажи товаров, § 5 Abs. 1 Nr. 3)?
Подтвердите, что для persönliche Dienstleistungen его нельзя применять автоматически.

**4.5.** Как отделить в отчётности **благотворительные** переводы от **оплаты услуг**, чтобы корректно определить,
что подпадает под DAC7, а что нет?

---

## V. Fundraising и налоги (4 разные модели — квалифицировать каждую)

**5.1. Donation to private person.** Подтверждаете, что прямой перевод частному лицу — **не** steuerlich abzugsfähige
Spende, а потенциально **Schenkung** (§ 7 ErbStG)? Как считается Freibetrag (Steuerklasse III, €20,000) — **между
конкретным donor и конкретным recipient** (а не как общий crowdfunding-pot), с суммированием по § 14 ErbStG за 10 лет?

**5.2.** Какие информационные/предупредительные обязанности у платформы перед донором о возможных налоговых
последствиях (Schenkung) прямых переводов частным лицам? Нужно ли это в UI/AGB?

**5.3. Donation to charitable organisation.** Условия налогового вычета по § 10b EStG и подтверждение через
Zuwendungsbestätigung (§ 50 EStDV) — что должна обеспечить наша gGmbH, чтобы выдавать корректные квитанции?

**5.4. Payment for task/service.** Налоговые последствия для исполнителя (ESt, GewSt, USt, регистрация) — какие
обязанности/риски у платформы (в т.ч. consumer-law, reporting)?

**5.5. Donation to charity earmarked for beneficiary.** Насколько допустима модель «донор → gGmbH → помощь
конкретному нуждающемуся» с учётом § 53 AO (mildtätige Zwecke)? Где граница между легитимной уставной
деятельностью и недопустимым «номинальным транзитным каналом» для частных подарков?

**5.6.** Как корректно классифицировать транзакцию в момент оплаты (Schenkung / Dienstvertrag / Werkvertrag /
Kaufvertrag / Spende организации), чтобы правильно применять налог/возврат/чек?

---

## VI. Consumer law / Widerruf / возвраты

**6.1.** Для каждой модели (частный подарок / платная услуга / покупка товара / собственная цифровая услуга
платформы / пожертвование организации) — какие правила BGB о Fernabsatz и Verbraucherrecht применяются?

**6.2.** Что обязательно закрепить в AGB: наличие/отсутствие statutory withdrawal; момент начала исполнения услуги;
запрос потребителя начать исполнение до истечения Widerrufsfrist; последствия полного исполнения; refund-policy
сверх закона; chargeback; failed funding; отмена проекта?

**6.3.** Подтверждаете, что нельзя универсально писать «все платежи окончательны, возврат невозможен»? Какая
дифференцированная формулировка корректна?

**6.4.** «Donation refund»-кнопка: как её корректно квалифицировать и ограничить по разным типам транзакций?

---

## VII. DSA — Digital Services Act

**7.1.** Являемся ли мы online platform, дающей потребителям заключать distance contracts с traders, и применяется
ли **Article 30 DSA** (trader traceability)?

**7.2.** Полный перечень данных, которые мы обязаны получить до допуска trader (имя, адрес, телефон, email,
копия ID/e-identification, payment-account details, commercial-register, self-certification) — и как это соотносится
с тем, что «GwG-KYC нам не нужен, но platform/trader-KYC — нужен»?

**7.3.** Кто считается «trader» в нашей модели (исполнитель-физлицо? бизнес? благополучатель?), и для кого
Article 30 обязателен?

---

## VIII. VAT / налог с 5% комиссии

**8.1.** Как оформить 5% именно как вознаграждение платформы за intermediation-услугу (principal = получателю,
platform fee = выручка GmbH), совместимо со Stripe application fee?

**8.2.** VAT-treatment комиссии по UStG: место оказания услуги, B2B/B2C, § 3a UStG для посреднических услуг —
облагается ли USt комиссия, даже если underlying — donation? Нужна ли регистрация/OSS?

**8.3.** Кто платит 5% (recipient / payer / вычет из суммы получателя) — как это одинаково отразить в UI, checkout,
AGB, invoice/accounting и Stripe configuration? Есть ли предпочтительный с налоговой точки зрения вариант?

**8.4.** Invoicing: кто кому выставляет счёт (платформа получателю? Stripe? исполнитель заказчику?) и как это
согласовать с DAC7-отчётностью?

---

## IX. Корпоративная структура (GmbH + gGmbH/e.V.)

**9.1.** Подтверждаете рекомендацию: коммерческая **GmbH** (платформа/ПО/комиссия) + отдельная **gGmbH**
(настоящие пожертвования, Zuwendungsbestätigungen, mildtätige/gemeinnützige проекты)? Почему gGmbH предпочтительнее
e.V. для операционной цифровой деятельности (§ 21 BGB — неэкономическая основная цель e.V.)?

**9.2.** Требования к gGmbH: Satzung под §§ 51 ff. AO; Selbstlosigkeit (§ 55 AO); соответствие фактической
деятельности уставу; Vermögensbindung; квалификация коммерческой активности как Zweckbetrieb vs
wirtschaftlicher Geschäftsbetrieb (§ 14 AO). Что из этого критично на старте?

**9.3.** Может ли коммерческая GmbH легально «зарабатывать» на gGmbH (software licensing / service agreement /
cost allocation / trademark / IT / personnel)? Как обосновать и задокументировать цену услуг, чтобы не нарушить
nonprofit-требования? Какие конструкции опасны (напр. авто-перечисление 5% из donation без экономического обоснования)?

**9.4.** Какой межфирменный договор(ы) обязателен между GmbH и gGmbH, и как строго разделять счета/деньги?

---

## X. GDPR / Datenschutz

**10.1.** Роли по каждому data-flow: где Brida — Controller, где Stripe — independent Controller/Processor/Joint
Controller, где ComplyAdvantage — Processor/Controller? (Stripe Connect предусматривает, что платформа может быть
data controller и давать Stripe указания.)

**10.2.** Правовые основания (Art. 6) по процессам: registration, recipient onboarding, Stripe Connect/Identity,
ID-document storage, sanctions/PEP screening, fraud scoring, payments/refunds/disputes, messages, projects/uploads,
support, analytics, marketing, PStTG-reporting, DSA-verification. Подтвердите, что **consent НЕ должен** быть
универсальным основанием для обязательного KYC.

**10.3.** Хранение ID-документов: подтверждаете модель «raw ID → Stripe/verification provider; Brida получает только
результат/необходимые атрибуты», чтобы минимизировать breach exposure? Что мы вправе/обязаны хранить сами?

**10.4.** Selfie/biometrics: когда selfie становится biometric data особой категории (Art. 9) — при unique
identification? Нужна ли **DPIA** для Stripe Identity flow (facial templates/retention)?

**10.5.** Нужен ли нам Record of Processing Activities по всем перечисленным процессам, и есть ли шаблон/минимум?

---

## XI. Impressum / терминология

**11.1.** Полнота Impressum по § 5 DDG (название, адрес, Rechtsform, Vertretungsberechtigte, контакт, Handelsregister,
Registernummer, VAT/Wirtschafts-ID, Aufsichtsbehörde если применимо) — что обязательно для нас?

**11.2.** Подтвердите список **запрещённых** без спец-архитектуры терминов (Escrow, Escrow Account, Treuhandkonto,
Wallet, Brida Balance, Deposit, «funds held by Brida», «Brida holds your funds until completion», Guaranteed payout/donation)
и **допустимых** (Platform/Application fee, Payment processing by Stripe, Connected Account, Recipient, Beneficiary,
Service Provider, Funder, Supporter, Donation — только где действительно donation; Spende/Spender/Zuwendung — только
при выполненных налоговых предпосылках).

---

## XII. Apple nonprofit fee waiver

**12.1.** При каких условиях приложение gGmbH подходит под Apple nonprofit fee waiver (legal entity + nonprofit status

- не individual/sole prop + не Paid Applications Agreement + не продаёт digital goods/services)?

**12.2.** Наш кейс: если приложение монетизируется (комиссия/платные услуги) — совместимо ли это с waiver, или
waiver возможен только для полностью бесплатного благотворительного приложения gGmbH? Стоит ли вообще создавать
gGmbH ради Apple?

---

## XIII. Приоритеты и red lines (для итогового письменного заключения)

**13.1.** Пожалуйста, дайте **письменную квалификацию именно этой фиксированной архитектуры** (дословно):
«Stripe Connect Direct Charges; charge created on recipient's Connected Account; platform receives 5% application fee;
platform never receives principal funds; no internal wallet; no reallocation; no manual transfer to third parties;
no escrow; no user balance» — по ZAG (нужна ли лицензия), и при необходимости представьте этот flow в BaFin.

**13.2.** Подтвердите **red lines** — функции, которые нельзя добавлять без нового legal review: собственный
user wallet; internal balance; balance-to-balance переводы; пополнение/withdrawal Brida balance; хранение principal;
поступление общих клиентских денег на IBAN Brida; Separate Charges and Transfers; произвольный split после оплаты;
смена получателя после платежа; manual redistribution; самостоятельные международные payouts; currency exchange;
pooled accounts; cash; escrow; гарантированное удержание до milestone; lending; авансы под будущие пожертвования;
выпуск transferable credits/tokens.

**13.3.** Что из вышеперечисленного нужно закрыть **до production-launch платёжной части** (blocking), а что можно
после (non-blocking)? Просьба дать чек-лист «go/no-go».

---

### Приложение

- Полный внутренний правовой анализ (источник этих вопросов) — приложить к письму юристу.
- Просьба к юристу: ответ по каждому пункту с ссылкой на норму и с указанием, где требуется дополнительная
  информация от нас (Insufficient data to answer).
