// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  blankCephalometry, CephalometryEditor,
  evaluateCephalometry, parseCephalometry,
} from "./cephalometry-editor";
import { MEASURES } from "./cephalometry-diagram";
afterEach(cleanup);
describe("native lateral cephalometry",()=>{
  it("ships all nine measures and no iframe",()=>{
    const commit=vi.fn();
    const {container}=render(<MantineProvider><CephalometryEditor patientId="patient-a" entities={[]} readOnly={false} onCommit={commit}/></MantineProvider>);
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("img",{name:/Trazado cefalométrico/})).toBeInTheDocument();
    expect(MEASURES.map(m=>m.name)).toEqual(["SNA","SNB","ANB","SN.PP","SN.Gn","Eje facial","SN.Ploc","PP.GoGn","SN.GoGn"]);
  });
  it("extends PR66 metrics with Wits and avoids invented population norms",()=>{
    const saved=blankCephalometry();
    expect(saved.rows.WITS).toMatchObject({value:"",norm:"",sd:""});
    expect(saved.rows.CVM).toMatchObject({value:"",norm:"",sd:""});
    const commit=vi.fn();
    render(<MantineProvider><CephalometryEditor patientId="patient-a"
      entities={[]} readOnly={false} onCommit={commit}/></MantineProvider>);
    expect(screen.getByRole("textbox",{name:"Valor Wits"})).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox",{name:"Valor Wits"}),{target:{value:"-2.4"}});
    expect(commit.mock.lastCall?.[0].attributes.cephalometry.rows.WITS.value).toBe("-2.4");
  });
  it("does not save unedited sample measurements as real clinical values",()=>{
    const commit=vi.fn();
    render(<MantineProvider><CephalometryEditor patientId="patient-a" entities={[]} readOnly={false} onCommit={commit}/></MantineProvider>);
    fireEvent.change(screen.getByRole("textbox",{name:"Valor SNA"}),{target:{value:"83"}});
    const last=commit.mock.lastCall?.[0];
    expect(last.attributes.cephalometry.rows.SNA.value).toBe("83");
    expect(last.attributes.cephalometry.rows.SNB.value).toBe("");
    expect(last.attributes.cephalometry.example).toBe(false);
    expect(last.attributes.assessmentType).toBe("LATERAL_CEPHALOMETRY");
  });
  it("keeps existing Supabase JSON columns and manual interpretation",()=>{
    const saved=blankCephalometry();
    saved.rows.ANB={value:"7",norm:"2",sd:"2",interp:"Validado por especialista",manual:true};
    saved.custom=[{id:"cnew",name:"Personalizada",value:"9",norm:"8",sd:"1",interp:"",manual:false}];
    const restored=parseCephalometry(JSON.parse(JSON.stringify(saved)));
    expect(restored).toEqual(saved);
    const evaluation=evaluateCephalometry(restored!.rows.ANB!,"ANB");
    expect(evaluation).toMatchObject({deviation:5,status:"hi",auto:"Clase II esquelética"});
  });
  it("disables editing when viewing a historical odontogram",()=>{
    const commit=vi.fn();
    render(<MantineProvider><CephalometryEditor patientId="patient-a" entities={[]} readOnly={true} onCommit={commit}/></MantineProvider>);
    expect(screen.getByRole("textbox",{name:"Valor SNA"})).toBeDisabled();
    expect(screen.getByRole("button",{name:"Empezar en blanco"})).toBeDisabled();
  });
});