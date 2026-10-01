import React from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "../src/styles/tokens.css";
import "../src/styles/global.css";
import { dentyTheme } from "../src/styles/theme";
import { ClinicContactsList } from "../src/features/admin/clinic-contacts/clinic-contacts-list";
const rows = [
{ id:"one",name:"Laboratorio Norte",category:"Laboratorios",phones:[{number:"+34 600 111 222",type:"mobile"},{number:"910 222 333",type:"fixed"}],emails:["pedidos@norte.es"],hours:"L–V 09:00–18:00",notes:"Recogida diaria a las 13:00. Persona de referencia: Marta." },
{ id:"two",name:"Dental Supply",category:"Proveedores",phones:[{number:"+34 620 000 300",type:"mobile"}],emails:["ventas@dentalsupply.es"],hours:"L–V 08:00–17:00",notes:null },
{ id:"three",name:"Servicio técnico",category:"Mantenimiento",phones:[],emails:["soporte@tecnicodental.es"],hours:null,notes:null }
].map(r=>({...r,clinic_id:"demo",version:1,created_by:"demo",created_at:"2026-10-01",updated_at:"2026-10-01"}));
window.fetch=async(_url,init)=>{
 const {operation,parameters:p}=JSON.parse(init.body);
 if(operation==="list_clinic_contacts"){
  const filtered=rows.filter(r=>(!p.p_search||r.name.toLowerCase().includes(p.p_search.toLowerCase()))&&(!p.p_category||r.category===p.p_category));
  return new Response(JSON.stringify(filtered.map(r=>({...r,total_count:filtered.length}))),{status:200});
 }
 throw new Error("Visual fixture supports reads only");
};
createRoot(document.getElementById("root")).render(<MantineProvider theme={dentyTheme} defaultColorScheme="light"><main style={{padding:"32px 24px",maxWidth:1250,margin:"auto"}}><ClinicContactsList clinicId="demo" initialContacts={rows} initialTotalCount={rows.length}/></main></MantineProvider>);
