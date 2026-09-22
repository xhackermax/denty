"use client";

import { Table } from "@mantine/core";
import { tableFeatures, useTable } from "@tanstack/react-table";
import type { ColumnDef, RowData } from "@tanstack/react-table";

import styles from "./shared-ui.module.css";

const DATA_TABLE_FEATURES = tableFeatures({});

export type DataTableColumnDef<TData extends RowData> = ColumnDef<
  typeof DATA_TABLE_FEATURES,
  TData
>;

interface DataTableProps<TData extends RowData> {
  data: TData[];
  columns: DataTableColumnDef<TData>[];
  emptyLabel: string;
}

export function DataTable<TData extends RowData>({
  data,
  columns,
  emptyLabel,
}: DataTableProps<TData>) {
  const table = useTable<typeof DATA_TABLE_FEATURES, TData>({
    features: DATA_TABLE_FEATURES,
    data,
    columns,
  });

  return (
    <div className={styles.tableWrap}>
      <Table.ScrollContainer minWidth={640}>
        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead className={styles.tableHead}>
            {table.getHeaderGroups().map((group) => (
              <Table.Tr key={group.id}>
                {group.headers.map((header) => (
                  <Table.Th key={header.id}>
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </Table.Th>
                ))}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {table.getRowModel().rows.map((row) => (
              <Table.Tr key={row.id}>
                {row.getAllCells().map((cell) => (
                  <Table.Td key={cell.id}>
                    <table.FlexRender cell={cell} />
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
            {data.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>{emptyLabel}</Table.Td>
              </Table.Tr>
            ) : null}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </div>
  );
}
