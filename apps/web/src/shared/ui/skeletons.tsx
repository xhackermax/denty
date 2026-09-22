import { Skeleton } from "@mantine/core";

import styles from "./shared-ui.module.css";

export function CardSkeletons({ count = 3 }: { count?: number }) {
  return (
    <div className={styles.skeletonStack} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} height={84} radius="lg" />
      ))}
    </div>
  );
}
