import { List, ScrollArea, Stack, Text, Title } from "@mantine/core";

import { parseTemplate, type TemplateValues } from "./template-render";

/** The template text, readable on screen before signing. */
export function TemplateText({
  body,
  values,
  height = 320,
}: {
  body: string;
  values: TemplateValues;
  height?: number;
}) {
  return (
    <ScrollArea.Autosize mah={height} type="auto" offsetScrollbars>
      <Stack gap={6}>
        {parseTemplate(body, values).map((block, index) =>
          block.kind === "heading" ? (
            <Title key={index} order={5} mt={6}>
              {block.text}
            </Title>
          ) : block.kind === "list" ? (
            <List key={index} size="sm" spacing={2}>
              {block.items.map((item, itemIndex) => (
                <List.Item key={itemIndex}>{item}</List.Item>
              ))}
            </List>
          ) : (
            <Text key={index} size="sm">
              {block.text}
            </Text>
          ),
        )}
      </Stack>
    </ScrollArea.Autosize>
  );
}
