"use client";

import { Alert, Badge, Stack, Text } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import styles from "@/shared/ui/parity.module.css";

export function CampaignsModule() {
  const campaigns = useQuery({ queryKey: dentyQueryKeys.campaigns.all, queryFn: () => getBrowserApi().engagement.marketing.campaigns() });
  if (campaigns.isError) return <Alert color="red">No se pudieron cargar las campañas reales.</Alert>;
  return <Stack><div className={styles.rowList}>{(campaigns.data?.items??[]).map((campaign)=><div className={styles.row} key={`${campaign.provider}:${campaign.externalId}`}><div className={styles.rowMain}><span className={styles.rowTitle}>{campaign.name}</span><span className={styles.rowMeta}>{campaign.provider}</span></div><Badge variant="light">{campaign.status}</Badge></div>)}{!campaigns.isLoading && (campaigns.data?.items.length??0)===0?<Text c="dimmed">No hay campañas sincronizadas.</Text>:null}</div></Stack>;
}
