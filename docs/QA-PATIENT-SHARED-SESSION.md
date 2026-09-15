# QA manual · Administrador ↔ Denty Paciente

## Objetivo

Comprobar que dos cuentas distintas pueden estar abiertas al mismo tiempo sobre la misma ficha sin mezclar menús, títulos ni roles.

## Prueba recomendada

1. Sirve Denty desde el mismo origen web y abre dos pestañas.
2. En la pestaña A entra como **Cuenta Administrador**.
3. En la pestaña B entra como **Cuenta Paciente** y elige el paciente que quieres simular.
4. Mantén ambas pestañas abiertas.
5. En Administrador abre ese paciente, entra en Odontograma y marca una caries, por ejemplo en 26 O.
6. Guarda/cambia de pantalla para que Denty persista el cambio.
7. Vuelve a la pestaña Paciente. Debe actualizarse desde el repositorio compartido y mostrar en **Mi boca ahora** el hallazgo del 26.
8. Repite con una cita, presupuesto, pago o documento. El paciente debe leer el mismo dato con presentación adaptada.
9. Desde Paciente confirma o reprograma una cita. En Administrador debe aparecer el nuevo estado/fecha tras la sincronización.
10. Usa **Cambiar cuenta** en cada pestaña y confirma que una pestaña no cambia el rol de la otra.

## Qué está separado

- Menú y navegación clínica.
- Cabecera de Denty Paciente.
- Rol/usuario activo por pestaña.
- Paciente seleccionado por la sesión paciente.

## Qué se comparte

- Pacientes.
- Odontogramas.
- Citas y sala de espera.
- Planes de tratamiento.
- Presupuestos y pagos.
- Documentos y archivos.
- Estado del portal paciente.

## Limitación de la preview

La sincronización actual funciona entre pestañas del mismo navegador/perfil y origen porque comparten el repositorio del navegador. El futuro servidor local sustituirá esa persistencia y permitirá una fuente de datos multi-dispositivo con autenticación real.
