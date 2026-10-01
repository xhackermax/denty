"use client";
import { Alert, Button, Group, Modal, Text } from "@mantine/core";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
export interface UnsavedGuard {
  dirty: boolean;
  onSave: () => Promise<void>;
  onDiscard: () => void;
}
const internal = (path: string) => /^\/(?:app|patient)(?:\/|\?|$)/.test(path);
export function backTarget(history: readonly string[], fallback: string): string {
  const previous = history.at(-2);
  return previous && internal(previous) ? previous : internal(fallback) ? fallback : "/app";
}
interface NavigationContextValue {
  pathname: string;
  register: (guard: () => UnsavedGuard) => () => void;
  confirmLeave: (navigate: () => void) => void;
  goBack: (fallback: string) => void;
}
export const NavigationContext = createContext<NavigationContextValue | null>(null);
export function NavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const history = useRef<string[]>([]);
  const active = useRef<(() => UnsavedGuard) | null>(null);
  const [pending, setPending] = useState<{ guard: UnsavedGuard; navigate: () => void } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const path =
      pathname +
      (typeof window !== "undefined" && window.location.pathname === pathname
        ? window.location.search
        : "");
    const stack = history.current;
    if (stack.at(-2) === path) stack.pop();
    else if (stack.at(-1) !== path) history.current = [...stack.slice(-49), path];
  }, [pathname]);
  const register = useCallback((guard: () => UnsavedGuard) => {
    active.current = guard;
    return () => {
      if (active.current === guard) active.current = null;
    };
  }, []);
  const confirmLeave = useCallback((navigate: () => void) => {
    const guard = active.current?.();
    if (!guard?.dirty) {
      navigate();
      return;
    }
    setError(null);
    setPending({ guard, navigate });
  }, []);
  const goBack = useCallback(
    (fallback: string) => confirmLeave(() => router.push(backTarget(history.current, fallback))),
    [confirmLeave, router],
  );
  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        !active.current?.().dirty
      )
        return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (
        !(link instanceof HTMLAnchorElement) ||
        link.target === "_blank" ||
        link.hasAttribute("download")
      )
        return;
      const url = new URL(link.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        !internal(url.pathname) ||
        (url.pathname === window.location.pathname && url.search === window.location.search)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      confirmLeave(() => router.push(url.pathname + url.search + url.hash));
    };
    document.addEventListener("click", click, true);
    return () => document.removeEventListener("click", click, true);
  }, [confirmLeave, router]);
  const value = useMemo(
    () => ({ pathname, register, confirmLeave, goBack }),
    [pathname, register, confirmLeave, goBack],
  );
  const save = async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      await pending.guard.onSave();
      setPending(null);
      pending.navigate();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo guardar. Conservamos tus cambios.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <NavigationContext.Provider value={value}>
      {children}
      <Modal
        opened={pending !== null}
        onClose={() => {
          if (!busy) setPending(null);
        }}
        title="Tienes cambios sin guardar"
        centered
        closeOnEscape={!busy}
        closeOnClickOutside={!busy}
      >
        <Text>Guarda los cambios o descártalos para continuar.</Text>
        {error ? (
          <Alert color="red" mt="sm">
            {error}
          </Alert>
        ) : null}
        <Group mt="md" justify="flex-end">
          <Button variant="default" disabled={busy} onClick={() => setPending(null)}>
            Cancelar
          </Button>
          <Button
            variant="light"
            color="red"
            disabled={busy}
            onClick={() => {
              if (pending) {
                pending.guard.onDiscard();
                setPending(null);
                pending.navigate();
              }
            }}
          >
            Descartar
          </Button>
          <Button loading={busy} onClick={() => void save()}>
            Guardar
          </Button>
        </Group>
      </Modal>
    </NavigationContext.Provider>
  );
}
