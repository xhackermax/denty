"use client";

import {
  Badge,
  Button,
  Group,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { IconCheck, IconRefresh } from "@tabler/icons-react";

import { VISUAL_PALETTES, VISUAL_WALLPAPERS } from "@/domain/visual-personalization";
import { useVisualPreferences } from "@/shared/ui/visual-preferences-provider";

import styles from "./visual-personalization-panel.module.css";

export function VisualPersonalizationPanel() {
  const {
    palette,
    wallpaper,
    animations,
    setPalette,
    setWallpaper,
    setAnimations,
    reset,
  } = useVisualPreferences();

  return (
    <section className={styles.section} id="personalizacion" aria-labelledby="visual-settings-title">
      <Group justify="space-between" align="start" gap="sm">
        <div>
          <Title order={3} id="visual-settings-title">Personalización visual</Title>
          <Text size="sm" c="dimmed" mt={4}>
            Elige los colores, el fondo y el movimiento de Denty. Los cambios se ven al instante.
          </Text>
        </div>
        <Button
          variant="subtle"
          size="xs"
          leftSection={<IconRefresh size={15} />}
          onClick={reset}
        >
          Restablecer
        </Button>
      </Group>

      <Group justify="space-between" gap="md" className={styles.motionRow}>
        <div>
          <Text fw={700} size="sm">Animaciones de la interfaz</Text>
          <Text c="dimmed" size="xs">
            Desactiva transiciones, desplazamientos y efectos decorativos. Respeta también
            «Reducir movimiento» del sistema.
          </Text>
        </div>
        <Switch
          label={animations ? "Activadas" : "Desactivadas"}
          checked={animations}
          onChange={(event) => setAnimations(event.currentTarget.checked)}
          aria-label="Activar animaciones"
        />
      </Group>

      <Stack gap="xs">
        <Group justify="space-between" gap="xs">
          <Title order={4}>Temas de color</Title>
          <Badge variant="light">9 paletas + Denty</Badge>
        </Group>
        <Text size="xs" c="dimmed">
          Colores originales de Hostinger, adaptados a botones y texto legibles.
          Los colores clínicos de estados y alertas no cambian.
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
          {VISUAL_PALETTES.map((theme) => (
            <UnstyledButton
              key={theme.id}
              className={styles.themeChoice}
              data-selected={theme.id === palette}
              onClick={() => setPalette(theme.id)}
              aria-pressed={theme.id === palette}
              aria-label={theme.number ? "Seleccionar paleta " + theme.number + ", " + theme.name : "Seleccionar paleta Denty original"}
            >
              <span className={styles.palettePreview} data-palette={theme.id} aria-hidden="true" />
              <span className={styles.choiceTitle}>
                <span className={styles.number}>{theme.number ? "N.º " + theme.number : "Denty"}</span>
                <strong>{theme.name}</strong>
                {palette === theme.id ? <IconCheck size={17} aria-label="Seleccionado" /> : null}
              </span>
              <span className={styles.description}>{theme.description}</span>
              <span className={styles.hexCodes}>{theme.colors.join(" · ")}</span>
            </UnstyledButton>
          ))}
        </SimpleGrid>
      </Stack>

      <Stack gap="xs">
        <Title order={4}>Fondos de pantalla</Title>
        <Text size="xs" c="dimmed">
          Diseños CSS originales inspirados en degradados abstractos y mallas digitales.
          No descargan imágenes externas ni dificultan la lectura de las fichas.
        </Text>
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
          {VISUAL_WALLPAPERS.map((background) => (
            <UnstyledButton
              key={background.id}
              className={styles.wallpaperChoice}
              data-selected={background.id === wallpaper}
              onClick={() => setWallpaper(background.id)}
              aria-pressed={background.id === wallpaper}
              aria-label={"Seleccionar fondo " + background.name}
            >
              <span className={styles.wallpaperPreview} data-wallpaper={background.id} aria-hidden="true" />
              <span className={styles.choiceTitle}>
                <strong>{background.name}</strong>
                {background.id === wallpaper ? <IconCheck size={16} aria-label="Seleccionado" /> : null}
              </span>
              <span className={styles.description}>{background.description}</span>
            </UnstyledButton>
          ))}
        </SimpleGrid>
      </Stack>
      <Text c="dimmed" size="xs">
        Las preferencias se guardan únicamente en este navegador, no afectan a otros usuarios
        ni a los datos de los pacientes. El tema claro/oscuro sigue controlándose por separado.
      </Text>
    </section>
  );
}
