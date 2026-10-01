"use client";

import { Button, Group, Stack, Text, Title } from "@mantine/core";
import { IconBrandFacebook, IconBrandGoogle } from "@tabler/icons-react";

export default function CampaignsPage() {
  return (
    <Stack gap="lg" p="xl">
      <div>
        <Title order={1}>Campañas Publicitarias</Title>
        <Text c="dimmed" size="sm" mt={4}>
          Accede directamente a tus plataformas de publicidad
        </Text>
      </div>

      <Group>
        <Button
          component="a"
          href="https://ads.google.com"
          target="_blank"
          rel="noopener noreferrer"
          size="lg"
          leftSection={<IconBrandGoogle size={20} />}
        >
          Google Ads
        </Button>

        <Button
          component="a"
          href="https://business.facebook.com"
          target="_blank"
          rel="noopener noreferrer"
          size="lg"
          color="blue"
          leftSection={<IconBrandFacebook size={20} />}
        >
          Meta Ads
        </Button>
      </Group>
    </Stack>
  );
}
