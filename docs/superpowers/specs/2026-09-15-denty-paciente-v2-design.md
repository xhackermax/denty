# Denty Paciente V2 Design

## Goal
Turn the existing Denty Paciente preview into a patient-facing treatment companion that connects clinical progress, appointments, financial planning, waiting-room status, decisions, preparation, support, and external treatment visualisation without pretending that secure backend integrations already exist.

## Product principles
- The patient should always understand: what is happening, what comes next, what it costs, and what delaying a step changes.
- Clinical delay and economic cancellation policy are shown separately.
- Information is explanatory, not coercive or alarmist.
- Features that require authentication, recurring payments, external vendor credentials, or server-side messaging are labelled as prepared integrations rather than simulated as live production services.
- Existing clinic-side data remains the source of truth for appointments, budgets, payments, documents and treatment plans.

## Navigation
Denty Paciente gets six patient-only views: Inicio, Tratamiento, Citas, Pagos, Documentos and Ayuda. The existing `state.patientPortalTab` becomes the router inside the patient portal.

## Core functions
1. Treatment status semaphore: green, amber or red, derived from future appointment availability, unsigned documents, accumulated delay and active clinical alerts.
2. Route to finish: show treatment phases, current phase, projected completion and accumulated delay caused by patient rescheduling.
3. Decisions: derive actionable patient tasks from documents, appointment state, payments and treatment progress.
4. Intelligent rescheduling: generate real compatible candidate slots using employee shifts and `appointmentAvailability`, show estimated delay impact, store the reason and a change history, then mutate the existing appointment only after confirmation.
5. Waiting list: patient can opt into an earlier-slot waiting list for the current appointment.
6. Waiting room: patient can check in on the day of the appointment, appointment status becomes `espera`, and Denty estimates queue position from the live agenda.
7. Appointment preparation: dynamic checklist based on appointment reason/type, persisted per appointment.
8. Finance: distinguish total treatment, performed, paid, current outstanding balance and future treatment. Patient can choose a preferred payment simulation of 1/3/6/12 months, without creating recurring charges.
9. Documents: show patient documents and allow existing view/print/PDF actions where available.
10. Support: structured patient requests with category and message, stored locally in the preview and surfaced as pending requests. Medical changes create a visible request for clinic review, not an automatic diagnosis or medical-record mutation.
11. Visual treatment: expose Smilecloud, ArchForm and clinic-approved education links only when configured on the patient or portal state. Missing links render as “not linked”, never invented URLs.
12. Last-visit summary and “what happens if I delay”: use existing appointment/treatment data and conservative explanatory copy.

## Data model
A backward-compatible `db.patientPortal` object keyed by patient id stores preview-only patient interaction state:
- `payment_months`
- `appointment_changes[]`
- `waiting_list[]`
- `checkins[]`
- `preparation{appointmentId: string[]}`
- `support_requests[]`
- `education_links[]`
- `smilecloud_url`
- `archform_url`

Migration/default logic must add this object without breaking existing localStorage databases.

## Accessibility and responsive behaviour
- Mobile-first patient navigation.
- Buttons keep at least 44 px interactive height.
- Status is communicated with text plus colour.
- No horizontal page overflow; long treatment timelines scroll only inside their own component where required.
- Focus-visible states remain available through the shared button system.
- Desktop uses multi-column cards; tablet/mobile collapses to one column.

## Out of scope for this local preview
- Secure patient authentication and family delegation.
- Real card direct debit / recurring payment agreements.
- Vendor-authenticated embedded Smilecloud or ArchForm sessions.
- Push/SMS/WhatsApp notification delivery.
- Legally binding cancellation-fee charging.
These need the secure backend phase.
