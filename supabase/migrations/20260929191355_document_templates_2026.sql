-- Denty document templates, 2026 edition: complete informed consents (Ley 41/2002),
-- images authorisation, data protection (RGPD / LOPDGDD) and attendance
-- certificate, replacing the one-line placeholders. Each template gets a NEW
-- version row and older versions are deactivated: documents already signed keep
-- pointing at the exact text the patient signed.
-- Bodies use a light markup ("## " headings, "- " items) and placeholders filled
-- when the document is shown or printed: {{paciente}} {{dni}} {{doctor}}
-- {{colegiado}} {{clinica}} {{tratamiento_texto}} {{fecha}} {{horario}}
-- {{motivo}} {{acompanante}} {{ciudad}} {{fecha_larga}}.

begin;

create temporary table denty_templates_2026(code text primary key, title text not null, body text not null) on commit drop;
insert into denty_templates_2026(code, title, body) values
('CONSENT_ANESTHESIA', $tpl$Consentimiento informado · Anestesia local$tpl$, $tpl$Yo, {{paciente}}, con DNI/NIE {{dni}} (o su representante legal), declaro que {{doctor}}, colegiado/a nº {{colegiado}}, me ha explicado de forma comprensible el tratamiento que se describe a continuación{{tratamiento_texto}}, y que he podido hacer todas las preguntas que he considerado necesarias.

## En qué consiste
Aplicación de un anestésico local mediante una o varias inyecciones en la encía o en la mucosa de la boca, para que el tratamiento sea indoloro.

## Objetivo y beneficios
Eliminar el dolor durante el procedimiento dental.

## Cómo se realiza
Se aplica primero, si procede, un anestésico tópico. Después se inyecta la cantidad necesaria de anestésico, con o sin vasoconstrictor, junto a la zona a tratar. El efecto dura habitualmente entre 1 y 3 horas.

## Riesgos frecuentes
- Sensación de hormigueo, labio o lengua «dormidos» durante unas horas.
- Pequeño hematoma o dolor en el punto de punción.
- Mordeduras involuntarias de labio, lengua o mejilla mientras dura el efecto.
- Palpitaciones o sensación de nerviosismo pasajera.

## Riesgos poco frecuentes pero importantes
- Reacción alérgica al anestésico.
- Lesión de un nervio con alteración de la sensibilidad, normalmente temporal y excepcionalmente permanente.
- Mareo o pérdida de conocimiento (lipotimia).
- Parálisis facial transitoria o alteraciones visuales pasajeras.

## Riesgos personalizados
Según mi estado de salud: ______________________________________________

## Alternativas
- Realizar el tratamiento sin anestesia cuando sea posible.
- Sedación o anestesia general en un centro hospitalario, cuando esté indicada.

## Si no me trato
Muchos tratamientos dentales resultarían dolorosos o no podrían realizarse con seguridad.

## Cuidados después del tratamiento
- No comer ni masticar hasta que desaparezca la sensación de acorchamiento.
- Vigilar a los niños para que no se muerdan el labio o la lengua.

## Declaración y consentimiento
- He leído y comprendido esta información, que se me ha entregado con antelación suficiente para reflexionar.
- Se me han explicado las alternativas posibles y las consecuencias de no tratarme.
- He informado de mis enfermedades, alergias, medicación (en especial anticoagulantes, antiagregantes y bifosfonatos), embarazo o lactancia.
- Sé que el resultado no puede garantizarse al cien por cien, porque depende también de factores biológicos y de mis cuidados.
- Puedo revocar este consentimiento en cualquier momento, por escrito y sin dar explicaciones, sin que ello afecte a la atención que recibo.

Por todo ello, DOY MI CONSENTIMIENTO para que se me realice el tratamiento indicado.$tpl$),
('CONSENT_CLEANING', $tpl$Consentimiento informado · Limpieza dental (tartrectomía)$tpl$, $tpl$Yo, {{paciente}}, con DNI/NIE {{dni}} (o su representante legal), declaro que {{doctor}}, colegiado/a nº {{colegiado}}, me ha explicado de forma comprensible el tratamiento que se describe a continuación{{tratamiento_texto}}, y que he podido hacer todas las preguntas que he considerado necesarias.

## En qué consiste
Eliminación de la placa bacteriana, el sarro y las manchas de los dientes, por encima y ligeramente por debajo de la encía, con ultrasonidos e instrumental manual, y pulido final.

## Objetivo y beneficios
Prevenir y tratar la gingivitis, prevenir la periodontitis y la caries, y mejorar el aliento y el aspecto de los dientes.

## Cómo se realiza
Se realiza en una o varias sesiones. Puede requerir anestesia local si hay sensibilidad o sarro bajo la encía.

## Riesgos frecuentes
- Sensibilidad al frío o al calor durante unos días.
- Sangrado leve de las encías, sobre todo si estaban inflamadas.
- Sensación de dientes «separados» o espacios más visibles al retirar el sarro que los unía.

## Riesgos poco frecuentes pero importantes
- Movilidad de dientes con poco soporte óseo que estaba enmascarada por el sarro.
- Desprendimiento de empastes o coronas que ya estaban deteriorados.
- Retracción de la encía al desinflamarse.

## Riesgos personalizados
Según mi estado de salud: ______________________________________________

## Alternativas
- Limpieza con aeropulidor o instrumental exclusivamente manual.
- Tratamiento periodontal (raspado y alisado radicular) si hay periodontitis.

## Si no me trato
El sarro seguirá acumulándose y favorecerá la inflamación de las encías, la pérdida de hueso y, con el tiempo, de dientes.

## Cuidados después del tratamiento
- Cepillado al menos dos veces al día y limpieza entre los dientes con seda o cepillos interproximales.
- Revisiones y limpiezas periódicas según le indique su dentista.

## Declaración y consentimiento
- He leído y comprendido esta información, que se me ha entregado con antelación suficiente para reflexionar.
- Se me han explicado las alternativas posibles y las consecuencias de no tratarme.
- He informado de mis enfermedades, alergias, medicación (en especial anticoagulantes, antiagregantes y bifosfonatos), embarazo o lactancia.
- Sé que el resultado no puede garantizarse al cien por cien, porque depende también de factores biológicos y de mis cuidados.
- Puedo revocar este consentimiento en cualquier momento, por escrito y sin dar explicaciones, sin que ello afecte a la atención que recibo.

Por todo ello, DOY MI CONSENTIMIENTO para que se me realice el tratamiento indicado.$tpl$),
('CONSENT_PERIO', $tpl$Consentimiento informado · Tratamiento periodontal$tpl$, $tpl$Yo, {{paciente}}, con DNI/NIE {{dni}} (o su representante legal), declaro que {{doctor}}, colegiado/a nº {{colegiado}}, me ha explicado de forma comprensible el tratamiento que se describe a continuación{{tratamiento_texto}}, y que he podido hacer todas las preguntas que he considerado necesarias.

## En qué consiste
Tratamiento de la enfermedad de las encías (periodontitis) mediante raspado y alisado de las raíces por debajo de la encía, por cuadrantes y, cuando está indicado, cirugía periodontal o gingivectomía.

## Objetivo y beneficios
Detener la pérdida de hueso que sujeta los dientes, reducir la inflamación, el sangrado y las bolsas periodontales, y conservar los dientes el mayor tiempo posible.

## Cómo se realiza
Se realiza con anestesia local, habitualmente en varias sesiones. Puede complementarse con antisépticos o antibióticos y requiere revisiones de mantenimiento.

## Riesgos frecuentes
- Sensibilidad dental al frío durante semanas.
- Retracción de la encía, con dientes que parecen más largos y espacios entre ellos.
- Molestias e inflamación durante unos días.

## Riesgos poco frecuentes pero importantes
- Aumento de la movilidad de algún diente al desinflamarse la encía.
- Infección o sangrado prolongado.
- Que algún diente muy afectado no pueda conservarse y deba extraerse.

## Riesgos personalizados
Según mi estado de salud: ______________________________________________

## Alternativas
- Mantenimiento periodontal sin tratamiento activo (solo frena parcialmente la enfermedad).
- Extracción de los dientes sin posibilidad de conservación.

## Si no me trato
La periodontitis avanza y provoca movilidad y pérdida de dientes; además se asocia a diabetes y enfermedad cardiovascular.

## Cuidados después del tratamiento
- Higiene diaria cuidadosa con cepillos interproximales.
- Evitar el tabaco, que empeora mucho el resultado.
- Acudir a las revisiones de mantenimiento cada 3–6 meses.

## Declaración y consentimiento
- He leído y comprendido esta información, que se me ha entregado con antelación suficiente para reflexionar.
- Se me han explicado las alternativas posibles y las consecuencias de no tratarme.
- He informado de mis enfermedades, alergias, medicación (en especial anticoagulantes, antiagregantes y bifosfonatos), embarazo o lactancia.
- Sé que el resultado no puede garantizarse al cien por cien, porque depende también de factores biológicos y de mis cuidados.
- Puedo revocar este consentimiento en cualquier momento, por escrito y sin dar explicaciones, sin que ello afecte a la atención que recibo.

Por todo ello, DOY MI CONSENTIMIENTO para que se me realice el tratamiento indicado.$tpl$),
('CONSENT_FILLINGS', $tpl$Consentimiento informado · Obturaciones (empastes)$tpl$, $tpl$Yo, {{paciente}}, con DNI/NIE {{dni}} (o su representante legal), declaro que {{doctor}}, colegiado/a nº {{colegiado}}, me ha explicado de forma comprensible el tratamiento que se describe a continuación{{tratamiento_texto}}, y que he podido hacer todas las preguntas que he considerado necesarias.

## En qué consiste
Eliminación del tejido dental afectado por la caries o la fractura y reconstrucción del diente con un material restaurador (composite, ionómero de vidrio u otro).

## Objetivo y beneficios
Detener la caries, recuperar la forma y la función del diente y evitar que el daño llegue al nervio.

## Cómo se realiza
Suele hacerse con anestesia local. Se aísla el diente, se elimina la caries y se coloca el material por capas, que se endurece con luz. Finalmente se ajusta la mordida y se pule.

## Riesgos frecuentes
- Sensibilidad al frío, al calor o al morder durante unos días o semanas.
- Necesidad de pequeños ajustes de la mordida.

## Riesgos poco frecuentes pero importantes
- Que la caries sea más profunda de lo previsto y el nervio resulte afectado, lo que puede requerir una endodoncia.
- Fractura del diente o del empaste, sobre todo en dientes muy debilitados.
- Caries secundaria en el borde del empaste con el paso del tiempo.

## Riesgos personalizados
Según mi estado de salud: ______________________________________________

## Alternativas
- Incrustación o corona en dientes muy destruidos.
- Extracción del diente.

## Si no me trato
La caries avanzará, pudiendo causar dolor, infección, pérdida del nervio y, finalmente, del diente.

## Cuidados después del tratamiento
- No comer hasta que pase el efecto de la anestesia.
- Consultar si persiste la sensibilidad o si nota que la mordida no es correcta.

## Declaración y consentimiento
- He leído y comprendido esta información, que se me ha entregado con antelación suficiente para reflexionar.
- Se me han explicado las alternativas posibles y las consecuencias de no tratarme.
- He informado de mis enfermedades, alergias, medicación (en especial anticoagulantes, antiagregantes y bifosfonatos), embarazo o lactancia.
- Sé que el resultado no puede garantizarse al cien por cien, porque depende también de factores biológicos y de mis cuidados.
- Puedo revocar este consentimiento en cualquier momento, por escrito y sin dar explicaciones, sin que ello afecte a la atención que recibo.

Por todo ello, DOY MI CONSENTIMIENTO para que se me realice el tratamiento indicado.$tpl$),
('CONSENT_ENDO', $tpl$Consentimiento informado · Endodoncia$tpl$, $tpl$Yo, {{paciente}}, con DNI/NIE {{dni}} (o su representante legal), declaro que {{doctor}}, colegiado/a nº {{colegiado}}, me ha explicado de forma comprensible el tratamiento que se describe a continuación{{tratamiento_texto}}, y que he podido hacer todas las preguntas que he considerado necesarias.

## En qué consiste
Eliminación del nervio (pulpa) inflamado, infectado o necrótico del interior del diente, limpieza y desinfección de los conductos radiculares y sellado con un material biocompatible. Incluye pulpotomías y tratamientos con Biodentine o similares.

## Objetivo y beneficios
Eliminar el dolor y la infección y conservar el diente en la boca.

## Cómo se realiza
Se realiza con anestesia local y aislamiento con dique de goma, en una o varias sesiones, con radiografías de control. El diente endodonciado suele necesitar después una reconstrucción, un perno o una corona.

## Riesgos frecuentes
- Dolor o molestias al morder durante unos días.
- Inflamación de la zona.
- Fractura del empaste provisional entre sesiones.

## Riesgos poco frecuentes pero importantes
- Rotura de un instrumento dentro del conducto.
- Perforación de la raíz o del suelo de la cámara pulpar.
- Conductos calcificados o curvos que impiden completar el tratamiento.
- Fracaso del tratamiento con persistencia de la infección, que puede requerir repetirlo (reendodoncia), una cirugía o la extracción.
- Fractura del diente, más frágil tras la endodoncia si no se protege.

## Riesgos personalizados
Según mi estado de salud: ______________________________________________

## Alternativas
- Extracción del diente y posterior reposición con implante, puente o prótesis.

## Si no me trato
La infección puede extenderse al hueso y a los tejidos cercanos (flemón, absceso) y provocar la pérdida del diente.

## Cuidados después del tratamiento
- Evitar masticar alimentos duros con ese diente hasta su reconstrucción definitiva.
- Tomar la medicación indicada.
- Acudir a la cita de reconstrucción o corona lo antes posible.

## Declaración y consentimiento
- He leído y comprendido esta información, que se me ha entregado con antelación suficiente para reflexionar.
- Se me han explicado las alternativas posibles y las consecuencias de no tratarme.
- He informado de mis enfermedades, alergias, medicación (en especial anticoagulantes, antiagregantes y bifosfonatos), embarazo o lactancia.
- Sé que el resultado no puede garantizarse al cien por cien, porque depende también de factores biológicos y de mis cuidados.
- Puedo revocar este consentimiento en cualquier momento, por escrito y sin dar explicaciones, sin que ello afecte a la atención que recibo.

Por todo ello, DOY MI CONSENTIMIENTO para que se me realice el tratamiento indicado.$tpl$),
('CONSENT_EXTRACTION', $tpl$Consentimiento informado · Extracción dental$tpl$, $tpl$Yo, {{paciente}}, con DNI/NIE {{dni}} (o su representante legal), declaro que {{doctor}}, colegiado/a nº {{colegiado}}, me ha explicado de forma comprensible el tratamiento que se describe a continuación{{tratamiento_texto}}, y que he podido hacer todas las preguntas que he considerado necesarias.

## En qué consiste
Extracción de uno o varios dientes, incluidas las muelas del juicio y los dientes temporales, de forma simple o mediante cirugía (abriendo la encía y, si es necesario, retirando hueso o dividiendo el diente).

## Objetivo y beneficios
Eliminar un diente que no puede conservarse o que causa problemas (infección, dolor, falta de espacio, motivos ortodóncicos o protésicos).

## Cómo se realiza
Con anestesia local se separa la encía, se luxa el diente y se extrae. En extracciones quirúrgicas puede ser necesario dar puntos de sutura.

## Riesgos frecuentes
- Dolor, inflamación y hematoma durante varios días.
- Sangrado leve durante las primeras horas.
- Limitación para abrir la boca durante unos días.

## Riesgos poco frecuentes pero importantes
- Infección o alveolitis seca (dolor intenso a los 2–4 días).
- Lesión del nervio dentario o lingual, con acorchamiento del labio, mentón o lengua, habitualmente temporal y excepcionalmente permanente.
- Comunicación entre la boca y el seno maxilar en muelas superiores.
- Fractura de la raíz, de la tabla ósea o, excepcionalmente, de la mandíbula.
- Daño en dientes vecinos o empastes cercanos.

## Riesgos personalizados
Según mi estado de salud: ______________________________________________

## Alternativas
- Tratamiento conservador (endodoncia, reconstrucción) cuando sea viable.
- Seguimiento y control sin extracción.

## Si no me trato
Persistirá el problema que motiva la extracción: dolor, infección recurrente, daño a los dientes vecinos o imposibilidad de realizar otros tratamientos.

## Cuidados después del tratamiento
- Morder una gasa 30 minutos; no enjuagarse ni escupir en las primeras 24 horas.
- Aplicar frío local, dieta blanda y templada, y no fumar ni beber alcohol.
- Tomar la medicación indicada y consultar si hay fiebre, sangrado abundante o dolor creciente.

## Declaración y consentimiento
- He leído y comprendido esta información, que se me ha entregado con antelación suficiente para reflexionar.
- Se me han explicado las alternativas posibles y las consecuencias de no tratarme.
- He informado de mis enfermedades, alergias, medicación (en especial anticoagulantes, antiagregantes y bifosfonatos), embarazo o lactancia.
- Sé que el resultado no puede garantizarse al cien por cien, porque depende también de factores biológicos y de mis cuidados.
- Puedo revocar este consentimiento en cualquier momento, por escrito y sin dar explicaciones, sin que ello afecte a la atención que recibo.

Por todo ello, DOY MI CONSENTIMIENTO para que se me realice el tratamiento indicado.$tpl$),
('CONSENT_SURGERY', $tpl$Consentimiento informado · Cirugía oral y regeneración$tpl$, $tpl$Yo, {{paciente}}, con DNI/NIE {{dni}} (o su representante legal), declaro que {{doctor}}, colegiado/a nº {{colegiado}}, me ha explicado de forma comprensible el tratamiento que se describe a continuación{{tratamiento_texto}}, y que he podido hacer todas las preguntas que he considerado necesarias.

## En qué consiste
Procedimientos quirúrgicos en la boca como injertos de hueso (autólogo, xenoinjerto o aloinjerto), membranas, elevación de seno maxilar (crestal o lateral), injerto de tejido conectivo, regeneración vertical o regularización del reborde óseo (alveoloplastia).

## Objetivo y beneficios
Recuperar o mejorar la cantidad y calidad del hueso y la encía para poder colocar implantes o prótesis con seguridad, o mejorar la estética y la salud de los tejidos.

## Cómo se realiza
Con anestesia local se abre la encía, se prepara la zona y se colocan los materiales de relleno y membranas necesarios; después se sutura. La cicatrización requiere varios meses antes de la siguiente fase.

## Riesgos frecuentes
- Dolor, inflamación y hematoma en la cara durante una o dos semanas.
- Sangrado leve y molestias al masticar en la zona.
- Congestión nasal o pequeño sangrado por la nariz tras una elevación de seno.

## Riesgos poco frecuentes pero importantes
- Infección de la zona o del material de injerto.
- Pérdida parcial o total del injerto, que puede requerir repetir el procedimiento.
- Exposición de la membrana o del injerto.
- Perforación de la membrana del seno maxilar o sinusitis.
- Lesión nerviosa con alteración de la sensibilidad, habitualmente temporal.

## Riesgos personalizados
Según mi estado de salud: ______________________________________________

## Alternativas
- Implantes cortos o angulados, cuando sean posibles.
- Prótesis removible o fija sin implantes.
- No realizar el tratamiento.

## Si no me trato
Puede no ser posible colocar implantes o prótesis estables, y el hueso seguirá reabsorbiéndose.

## Cuidados después del tratamiento
- Frío local, dieta blanda y fría y no masticar en la zona.
- No sonarse con fuerza ni hacer esfuerzos durante dos semanas tras una elevación de seno.
- No fumar: el tabaco multiplica el riesgo de fracaso.
- Tomar la medicación prescrita y acudir a las revisiones.

## Declaración y consentimiento
- He leído y comprendido esta información, que se me ha entregado con antelación suficiente para reflexionar.
- Se me han explicado las alternativas posibles y las consecuencias de no tratarme.
- He informado de mis enfermedades, alergias, medicación (en especial anticoagulantes, antiagregantes y bifosfonatos), embarazo o lactancia.
- Sé que el resultado no puede garantizarse al cien por cien, porque depende también de factores biológicos y de mis cuidados.
- Puedo revocar este consentimiento en cualquier momento, por escrito y sin dar explicaciones, sin que ello afecte a la atención que recibo.

Por todo ello, DOY MI CONSENTIMIENTO para que se me realice el tratamiento indicado.$tpl$),
('CONSENT_IMPLANT', $tpl$Consentimiento informado · Implantes dentales$tpl$, $tpl$Yo, {{paciente}}, con DNI/NIE {{dni}} (o su representante legal), declaro que {{doctor}}, colegiado/a nº {{colegiado}}, me ha explicado de forma comprensible el tratamiento que se describe a continuación{{tratamiento_texto}}, y que he podido hacer todas las preguntas que he considerado necesarias.

## En qué consiste
Colocación quirúrgica de uno o varios implantes de titanio en el hueso maxilar o mandibular para sustituir raíces de dientes perdidos, con o sin cirugía guiada, y posterior colocación de pilares y prótesis sobre ellos.

## Objetivo y beneficios
Reponer dientes perdidos de forma fija o mejorar la sujeción de una prótesis removible, recuperando la masticación, la estética y la fonación.

## Cómo se realiza
Tras el estudio con radiografías y, cuando procede, TAC dental (CBCT), se coloca el implante con anestesia local. Tras un periodo de integración (habitualmente de 2 a 6 meses) se confecciona la prótesis definitiva. En algunos casos se coloca una prótesis provisional inmediata.

## Riesgos frecuentes
- Dolor, inflamación y hematoma durante unos días.
- Sangrado leve tras la cirugía.
- Molestias al masticar durante la cicatrización.

## Riesgos poco frecuentes pero importantes
- Falta de integración del implante en el hueso, que obliga a retirarlo y valorar colocarlo de nuevo.
- Lesión del nervio dentario con alteración de la sensibilidad del labio o del mentón, habitualmente temporal.
- Perforación del seno maxilar o de las fosas nasales.
- Infección alrededor del implante (periimplantitis) con pérdida de hueso a medio o largo plazo.
- Fractura del implante, del tornillo o de la prótesis.

## Riesgos personalizados
Según mi estado de salud: ______________________________________________

## Alternativas
- Puente fijo sobre dientes naturales.
- Prótesis removible.
- No reponer los dientes perdidos.

## Si no me trato
Pueden desplazarse los dientes vecinos y los antagonistas, perderse hueso en la zona y empeorar la masticación.

## Cuidados después del tratamiento
- Seguir las instrucciones postoperatorias y tomar la medicación indicada.
- No fumar: aumenta mucho el riesgo de fracaso del implante.
- Higiene muy cuidadosa y revisiones periódicas de mantenimiento de los implantes.

## Declaración y consentimiento
- He leído y comprendido esta información, que se me ha entregado con antelación suficiente para reflexionar.
- Se me han explicado las alternativas posibles y las consecuencias de no tratarme.
- He informado de mis enfermedades, alergias, medicación (en especial anticoagulantes, antiagregantes y bifosfonatos), embarazo o lactancia.
- Sé que el resultado no puede garantizarse al cien por cien, porque depende también de factores biológicos y de mis cuidados.
- Puedo revocar este consentimiento en cualquier momento, por escrito y sin dar explicaciones, sin que ello afecte a la atención que recibo.

Por todo ello, DOY MI CONSENTIMIENTO para que se me realice el tratamiento indicado.$tpl$),
('CONSENT_PROSTHESIS', $tpl$Consentimiento informado · Prótesis dental$tpl$, $tpl$Yo, {{paciente}}, con DNI/NIE {{dni}} (o su representante legal), declaro que {{doctor}}, colegiado/a nº {{colegiado}}, me ha explicado de forma comprensible el tratamiento que se describe a continuación{{tratamiento_texto}}, y que he podido hacer todas las preguntas que he considerado necesarias.

## En qué consiste
Confección y colocación de prótesis fijas (coronas, puentes, incrustaciones, carillas), removibles (completas, esqueléticas o flexibles) o sobre implantes, en el laboratorio dental, a partir de impresiones o escaneado intraoral.

## Objetivo y beneficios
Reponer dientes perdidos o reconstruir dientes muy dañados, recuperando la función masticatoria, la estética y la fonación.

## Cómo se realiza
Según el caso, se tallan los dientes pilares, se toman registros e impresiones o escaneados, se prueban las estructuras y se coloca la prótesis definitiva. Puede ser necesario llevar una prótesis provisional.

## Riesgos frecuentes
- Sensibilidad en los dientes tallados.
- Periodo de adaptación: rozaduras, sensación de cuerpo extraño y cambios en el habla con las prótesis removibles.
- Necesidad de ajustes tras la colocación.

## Riesgos poco frecuentes pero importantes
- Afectación del nervio de un diente tallado, que puede requerir una endodoncia.
- Fractura de la cerámica o de la estructura.
- Descementado de coronas o puentes.
- Caries o problemas de encía en los dientes pilares si la higiene no es adecuada.

## Riesgos personalizados
Según mi estado de salud: ______________________________________________

## Alternativas
- Otros tipos de prótesis (fija, removible o sobre implantes) según el caso.
- No reponer los dientes.

## Si no me trato
Pérdida de función masticatoria, movimientos de los dientes vecinos y problemas en la articulación de la mandíbula.

## Cuidados después del tratamiento
- Higiene cuidadosa de la prótesis y de los dientes pilares.
- Retirar las prótesis removibles por la noche y limpiarlas diariamente.
- Revisiones periódicas para ajustes y rebases.

## Declaración y consentimiento
- He leído y comprendido esta información, que se me ha entregado con antelación suficiente para reflexionar.
- Se me han explicado las alternativas posibles y las consecuencias de no tratarme.
- He informado de mis enfermedades, alergias, medicación (en especial anticoagulantes, antiagregantes y bifosfonatos), embarazo o lactancia.
- Sé que el resultado no puede garantizarse al cien por cien, porque depende también de factores biológicos y de mis cuidados.
- Puedo revocar este consentimiento en cualquier momento, por escrito y sin dar explicaciones, sin que ello afecte a la atención que recibo.

Por todo ello, DOY MI CONSENTIMIENTO para que se me realice el tratamiento indicado.$tpl$),
('CONSENT_ORTHO', $tpl$Consentimiento informado · Ortodoncia$tpl$, $tpl$Yo, {{paciente}}, con DNI/NIE {{dni}} (o su representante legal), declaro que {{doctor}}, colegiado/a nº {{colegiado}}, me ha explicado de forma comprensible el tratamiento que se describe a continuación{{tratamiento_texto}}, y que he podido hacer todas las preguntas que he considerado necesarias.

## En qué consiste
Corrección de la posición de los dientes y de la mordida mediante aparatos fijos (brackets), alineadores transparentes o aparatos removibles, y posterior uso de retenedores.

## Objetivo y beneficios
Mejorar la función masticatoria, la estética de la sonrisa y la higiene, y prevenir problemas en dientes, encías y articulación.

## Cómo se realiza
Tras el estudio (fotografías, radiografías, escaneado), se colocan los aparatos y se realizan revisiones periódicas durante todo el tratamiento. Al terminar, es imprescindible llevar retenedores.

## Riesgos frecuentes
- Molestias o dolor leve tras cada activación o cambio de alineador.
- Llagas o rozaduras en labios y mejillas.
- Dificultad inicial para hablar con algunos aparatos.

## Riesgos poco frecuentes pero importantes
- Manchas blancas o caries si la higiene es insuficiente.
- Reabsorción de las raíces de los dientes.
- Retracción de la encía.
- Recidiva: los dientes pueden volver a moverse si no se usan los retenedores.
- Molestias en la articulación temporomandibular.
- Prolongación del tratamiento si no se siguen las indicaciones (uso de alineadores al menos 22 horas al día, elásticos, citas).

## Riesgos personalizados
Según mi estado de salud: ______________________________________________

## Alternativas
- Tratamientos restauradores o protésicos que mejoren la estética sin mover los dientes.
- No realizar el tratamiento.

## Si no me trato
Persistirán la maloclusión y sus consecuencias: desgaste dental, dificultad de higiene y problemas estéticos o articulares.

## Cuidados después del tratamiento
- Higiene muy cuidadosa después de cada comida.
- Acudir a todas las revisiones y usar el aparato o los alineadores según lo indicado.
- Usar los retenedores de forma indefinida según las indicaciones.

## Declaración y consentimiento
- He leído y comprendido esta información, que se me ha entregado con antelación suficiente para reflexionar.
- Se me han explicado las alternativas posibles y las consecuencias de no tratarme.
- He informado de mis enfermedades, alergias, medicación (en especial anticoagulantes, antiagregantes y bifosfonatos), embarazo o lactancia.
- Sé que el resultado no puede garantizarse al cien por cien, porque depende también de factores biológicos y de mis cuidados.
- Puedo revocar este consentimiento en cualquier momento, por escrito y sin dar explicaciones, sin que ello afecte a la atención que recibo.

Por todo ello, DOY MI CONSENTIMIENTO para que se me realice el tratamiento indicado.$tpl$),
('CONSENT_WHITEN_EXT', $tpl$Consentimiento informado · Blanqueamiento dental$tpl$, $tpl$Yo, {{paciente}}, con DNI/NIE {{dni}} (o su representante legal), declaro que {{doctor}}, colegiado/a nº {{colegiado}}, me ha explicado de forma comprensible el tratamiento que se describe a continuación{{tratamiento_texto}}, y que he podido hacer todas las preguntas que he considerado necesarias.

## En qué consiste
Aclarado del color de los dientes mediante un gel con peróxido de hidrógeno o de carbamida, aplicado en la clínica y/o en casa con férulas a medida.

## Objetivo y beneficios
Mejorar el color y la estética de los dientes.

## Cómo se realiza
Tras una limpieza y la protección de la encía, se aplica el gel en una o varias sesiones en la clínica o se entregan férulas para aplicarlo en casa según las pautas indicadas.

## Riesgos frecuentes
- Sensibilidad dental durante el tratamiento y unos días después.
- Irritación leve de la encía.

## Riesgos poco frecuentes pero importantes
- Resultado desigual o menor del esperado; algunas manchas (tetraciclinas, fluorosis) responden poco.
- Los empastes, coronas y carillas no cambian de color y pueden necesitar sustituirse para igualar el tono.
- El color puede oscurecerse con el tiempo, sobre todo con café, tabaco o vino.

## Riesgos personalizados
Según mi estado de salud: ______________________________________________

## Alternativas
- Carillas o coronas.
- Microabrasión o limpieza con pulido.

## Si no me trato
No tiene consecuencias para la salud; el color de los dientes seguirá como está.

## Cuidados después del tratamiento
- Evitar alimentos y bebidas con colorantes, y el tabaco, durante 48 horas.
- Usar pasta desensibilizante si hay sensibilidad.
- No utilizar el gel más tiempo del indicado.

## Declaración y consentimiento
- He leído y comprendido esta información, que se me ha entregado con antelación suficiente para reflexionar.
- Se me han explicado las alternativas posibles y las consecuencias de no tratarme.
- He informado de mis enfermedades, alergias, medicación (en especial anticoagulantes, antiagregantes y bifosfonatos), embarazo o lactancia.
- Sé que el resultado no puede garantizarse al cien por cien, porque depende también de factores biológicos y de mis cuidados.
- Puedo revocar este consentimiento en cualquier momento, por escrito y sin dar explicaciones, sin que ello afecte a la atención que recibo.

Por todo ello, DOY MI CONSENTIMIENTO para que se me realice el tratamiento indicado.$tpl$),
('CONSENT_IMAGES', $tpl$Autorización para fotografías y radiografías$tpl$, $tpl$Yo, {{paciente}}, con DNI/NIE {{dni}}, autorizo a {{clinica}} a obtener fotografías, vídeos, radiografías, escáneres intraorales y TAC dental (CBCT) de mi boca y de mi cara como parte de mi atención.

## Uso clínico (necesario)
Las imágenes forman parte de mi historia clínica y se utilizan para el diagnóstico, la planificación del tratamiento, la comunicación con el laboratorio dental y el seguimiento de los resultados. Se conservan con la misma confidencialidad que el resto de mi historia clínica.

## Usos opcionales (marque lo que autoriza)
- ☐ Sí ☐ No — Uso docente y científico (cursos, congresos, publicaciones), siempre de forma anónima y sin que se me pueda identificar.
- ☐ Sí ☐ No — Uso en la web y redes sociales de la clínica, mostrando únicamente la boca y sin datos personales.
- ☐ Sí ☐ No — Uso en la web y redes sociales de la clínica en imágenes en las que se me pueda reconocer.

Puedo retirar estas autorizaciones opcionales en cualquier momento comunicándolo a la clínica, sin que afecte a mi tratamiento.$tpl$),
('DATA_PROTECTION', $tpl$Información y consentimiento de protección de datos$tpl$, $tpl$Yo, {{paciente}}, con DNI/NIE {{dni}}, he sido informado/a de lo siguiente, conforme al Reglamento (UE) 2016/679 (RGPD) y a la Ley Orgánica 3/2018 (LOPDGDD):

## Responsable del tratamiento
{{clinica}}. Puede contactar en la propia clínica o por los medios que figuran en este documento.

## Finalidades
- Prestarle asistencia sanitaria y mantener su historia clínica.
- Gestionar citas, presupuestos, facturación y cobros.
- Enviarle recordatorios de citas y avisos relacionados con su tratamiento.
- Cumplir las obligaciones legales, fiscales y sanitarias de la clínica.

## Legitimación
La prestación de la asistencia sanitaria (art. 9.2.h RGPD), la relación contractual (art. 6.1.b), el cumplimiento de obligaciones legales (art. 6.1.c) y, para los usos opcionales, su consentimiento (art. 6.1.a).

## Conservación
La historia clínica se conserva como mínimo cinco años desde el alta de cada proceso asistencial (Ley 41/2002), y los datos de facturación durante los plazos que fija la normativa fiscal.

## Destinatarios
Laboratorios dentales y otros profesionales que intervengan en su tratamiento, entidades aseguradoras o financieras cuando usted lo solicite, administraciones públicas cuando lo exija la ley, y proveedores tecnológicos que actúan como encargados del tratamiento con las debidas garantías. No se realizan transferencias internacionales fuera de las garantías del RGPD.

## Sus derechos
Puede ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad dirigiéndose a la clínica y acreditando su identidad. Si considera que sus derechos no se han respetado, puede reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).

## Consentimientos opcionales (marque lo que autoriza)
- ☐ Sí ☐ No — Recibir recordatorios y avisos por SMS, WhatsApp o correo electrónico.
- ☐ Sí ☐ No — Recibir información sobre promociones, campañas de salud y novedades de la clínica.

Declaro que los datos facilitados son ciertos y me comprometo a comunicar cualquier cambio.$tpl$),
('ATTENDANCE_CERTIFICATE', $tpl$Justificante de asistencia$tpl$, $tpl${{doctor}}, odontólogo/a colegiado/a nº {{colegiado}}, de {{clinica}},

CERTIFICA:

Que D./Dña. {{paciente}}, con DNI/NIE {{dni}}, ha acudido a consulta en este centro el día {{fecha}}{{horario}}{{motivo}}.{{acompanante}}

Y para que así conste a petición de la persona interesada y a los efectos oportunos, se expide el presente justificante en {{ciudad}}, a {{fecha_larga}}.$tpl$);

-- Only where the text actually changes (re-running this is a no-op).
with latest as (
  select distinct on (t.clinic_id, t.code) t.clinic_id, t.code, t.version, t.body
  from public.document_templates t
  order by t.clinic_id, t.code, t.version desc
), targets as (
  select c.id as clinic_id, n.code, n.title, n.body, coalesce(l.version, 0) + 1 as version
  from public.clinics c
  cross join denty_templates_2026 n
  left join latest l on l.clinic_id = c.id and l.code = n.code
  where l.body is distinct from n.body
), retired as (
  update public.document_templates t set active = false
  from targets g
  where t.clinic_id = g.clinic_id and t.code = g.code and t.active
  returning t.id
)
insert into public.document_templates(clinic_id, code, title, body, schema_json, active, version)
select g.clinic_id, g.code, g.title, g.body, '{}'::jsonb, true, g.version
from targets g;

commit;
