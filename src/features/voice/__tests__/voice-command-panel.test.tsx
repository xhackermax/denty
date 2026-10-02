// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VoiceCommandPanel, type VoiceCommandPanelProps } from "../voice-command-panel";

afterEach(cleanup);

function setup(overrides: Partial<VoiceCommandPanelProps> = {}) {
  const handlers = {
    onInterpret: vi.fn(),
    onClear: vi.fn(),
    onToggleMicrophone: vi.fn(),
    onConfirm: vi.fn(),
    onCancelPreview: vi.fn(),
    onChoosePatient: vi.fn(),
  };
  function Harness() {
    const [text, setText] = useState(overrides.text ?? "");
    return (
      <VoiceCommandPanel
        inputRef={createRef<HTMLTextAreaElement>()}
        text={text}
        onTextChange={setText}
        status="available"
        listening={false}
        showKeyboardDictationHint={false}
        preview={null}
        patientChoices={null}
        message={null}
        {...handlers}
        {...overrides}
      />
    );
  }
  render(
    <MantineProvider>
      <Harness />
    </MantineProvider>,
  );
  return handlers;
}

describe("VoiceCommandPanel", () => {
  it("offers one editable field to write or dictate an instruction", () => {
    setup();
    const field = screen.getByRole("textbox", { name: "Escribe o dicta una instrucción" });
    expect(field).toHaveAttribute("placeholder", "Marca caries en el dieciséis");
    fireEvent.change(field, { target: { value: "abre la agenda" } });
    expect(field).toHaveValue("abre la agenda");
    expect(screen.getByRole("button", { name: "Micrófono" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Interpretar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Limpiar" })).toBeEnabled();
  });

  it("disables Interpretar and Limpiar while the field is empty", () => {
    setup();
    expect(screen.getByRole("button", { name: "Interpretar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Limpiar" })).toBeDisabled();
  });

  it("interprets on Enter but never while the keyboard is composing", () => {
    const handlers = setup({ text: "marca caries en el 16" });
    const field = screen.getByRole("textbox", { name: "Escribe o dicta una instrucción" });
    fireEvent.keyDown(field, { key: "Enter", keyCode: 229 });
    fireEvent.compositionStart(field);
    fireEvent.keyDown(field, { key: "Enter" });
    expect(handlers.onInterpret).not.toHaveBeenCalled();
    fireEvent.compositionEnd(field);
    fireEvent.keyDown(field, { key: "Enter" });
    expect(handlers.onInterpret).toHaveBeenCalledTimes(1);
  });

  it("defers a tap on Interpretar until the keyboard finishes composing", () => {
    const handlers = setup({ text: "abre la agenda" });
    const field = screen.getByRole("textbox", { name: "Escribe o dicta una instrucción" });
    fireEvent.compositionStart(field);
    fireEvent.click(screen.getByRole("button", { name: "Interpretar" }));
    expect(handlers.onInterpret).not.toHaveBeenCalled();
    fireEvent.compositionEnd(field);
    expect(handlers.onInterpret).toHaveBeenCalledTimes(1);
  });

  it("clears with Limpiar", () => {
    const handlers = setup({ text: "abre" });
    fireEvent.click(screen.getByRole("button", { name: "Limpiar" }));
    expect(handlers.onClear).toHaveBeenCalledTimes(1);
  });

  it("switches the microphone control to stop while listening", () => {
    const handlers = setup({ listening: true, status: "listening" });
    fireEvent.click(screen.getByRole("button", { name: "Detener micrófono" }));
    expect(handlers.onToggleMicrophone).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Escuchando")).toBeInTheDocument();
  });

  it("locks the field while listening so dictation cannot overwrite typing", () => {
    const handlers = setup({ text: "marca", listening: true, status: "listening" });
    const field = screen.getByRole("textbox", { name: "Escribe o dicta una instrucción" });
    expect(field).toHaveAttribute("readonly");
    fireEvent.keyDown(field, { key: "Enter" });
    expect(handlers.onInterpret).not.toHaveBeenCalled();
  });

  it("announces the status in a polite live region", () => {
    setup({ status: "interpreting" });
    expect(screen.getByRole("status")).toHaveTextContent("Interpretando");
  });

  it("shows the Android keyboard dictation hint only when asked", () => {
    setup({ showKeyboardDictationHint: true });
    expect(screen.getByText("También puedes usar el micrófono de tu teclado.")).toBeInTheDocument();
  });

  it("keeps errors next to the field", () => {
    setup({ text: "marca", message: { tone: "error", text: "No se pudo interpretar." } });
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo interpretar.");
    expect(screen.getByRole("textbox", { name: "Escribe o dicta una instrucción" })).toHaveValue(
      "marca",
    );
  });

  it("shows a concrete confirmation for clinical changes", () => {
    const handlers = setup({
      text: "marca caries en el 16 oclusal",
      status: "awaiting_confirmation",
      preview: {
        readback: "Voy a apuntar caries en el 16 (O).",
        patientLabel: "Ana López · ficha 120",
        actions: [
          {
            description: "apuntar caries en el 16 (O)",
            details: [
              { label: "Diente", value: "16" },
              { label: "Superficie", value: "oclusal" },
            ],
          },
        ],
        ambiguities: [],
        blockers: [],
        canConfirm: true,
        source: "rules",
      },
    });
    expect(screen.getByText("Ana López · ficha 120")).toBeInTheDocument();
    expect(screen.getByText("apuntar caries en el 16 (O)")).toBeInTheDocument();
    expect(screen.getByText("oclusal")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(handlers.onConfirm).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(handlers.onCancelPreview).toHaveBeenCalledTimes(1);
  });

  it("blocks confirmation when data is missing", () => {
    setup({
      text: "cobra 50",
      preview: {
        readback: "Necesito método de pago.",
        actions: [{ description: "registrar un cobro", details: [] }],
        ambiguities: ["método de pago"],
        blockers: [],
        canConfirm: false,
        source: "rules",
      },
    });
    expect(screen.getByText("Faltan datos: método de pago")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  });

  it("disables Confirmar while executing to avoid running twice", () => {
    setup({
      text: "x",
      status: "executing",
      preview: {
        readback: "Voy a apuntar caries en el 16.",
        actions: [{ description: "apuntar caries en el 16", details: [] }],
        ambiguities: [],
        blockers: [],
        canConfirm: true,
        source: "rules",
      },
    });
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  });

  it("lets the person pick the right patient from the matches", () => {
    const handlers = setup({
      text: "busca a Ana",
      patientChoices: {
        title: "Pacientes que coinciden con «Ana»",
        verb: "Abrir",
        options: [
          { id: "a1", label: "Ana López · ficha 120" },
          { id: "a2", label: "Ana Martín · ficha 77" },
        ],
      },
    });
    expect(screen.getByText("Pacientes que coinciden con «Ana»")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Abrir Ana Martín · ficha 77" }));
    expect(handlers.onChoosePatient).toHaveBeenCalledWith("a2");
    expect(screen.queryByRole("button", { name: "Confirmar" })).toBeNull();
  });
});
