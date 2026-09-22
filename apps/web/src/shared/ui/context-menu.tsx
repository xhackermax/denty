"use client";

import { ActionIcon, Menu } from "@mantine/core";
import { IconDots } from "@tabler/icons-react";
import { useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";

interface ContextMenuItem {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

interface ContextMenuProps {
  label: string;
  items: readonly ContextMenuItem[];
}

export function ContextMenu({ label, items }: ContextMenuProps) {
  const [opened, setOpened] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startLongPress = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== "touch") return;
    timer.current = setTimeout(() => setOpened(true), 450);
  };

  const cancelLongPress = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <Menu opened={opened} onChange={setOpened} position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon
          variant="subtle"
          aria-label={label}
          onPointerDown={startLongPress}
          onPointerUp={cancelLongPress}
          onPointerCancel={cancelLongPress}
          onContextMenu={(event) => {
            event.preventDefault();
            setOpened(true);
          }}
        >
          <IconDots size={18} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {items.map((item) => (
          <Menu.Item
            key={item.label}
            {...(item.danger ? { color: "red" as const } : {})}
            {...(item.icon === undefined ? {} : { leftSection: item.icon })}
            onClick={item.onSelect}
          >
            {item.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
