"use client";

import { Group, SegmentedControl, Stack, Text } from "@mantine/core";
import { useState, type ReactNode } from "react";

type View = "editor" | "visual";

export interface OdontogramViewSwitchProps {
  editor: ReactNode;
  visual: (openEditor: () => void) => ReactNode;
}

/** The editor stays mounted while hidden: switching views must never drop unsaved changes. */
export function OdontogramViewSwitch({ editor, visual }: OdontogramViewSwitchProps) {
  const [view, setView] = useState<View>("editor");

  return (
    <Stack gap="sm">
      <Group>
        <SegmentedControl
          aria-label="Vista del odontograma"
          value={view}
          onChange={(value) => setView(value === "visual" ? "visual" : "editor")}
          data={[
            { value: "editor", label: "Editor" },
            { value: "visual", label: "Vista visual" },
          ]}
        />
      </Group>
      <div hidden={view !== "editor"}>{editor}</div>
      {view === "visual" ? (
        <>
          <Text size="xs" c="dimmed">
            Muestra lo guardado. Los cambios sin guardar del editor aparecerán aquí al guardarlos.
          </Text>
          {visual(() => setView("editor"))}
        </>
      ) : null}
    </Stack>
  );
}
