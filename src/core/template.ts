export function renderTemplate(
  template: string,
  data: Record<string, unknown>,
): string {
  let result = template;

  result = result.replace(/<%= (\w+) %>/g, (match, key) => {
    const value = data[key];
    return value !== undefined ? String(value) : match;
  });

  result = result.replace(/<%- (\w+) %>/g, (match, key) => {
    const value = data[key];
    return value !== undefined ? String(value) : match;
  });

  result = result.replace(
    /<% if \((\w+)\) %>([\s\S]*?)<% endif %>/g,
    (_match, condition, content) => {
      return data[condition] ? content : "";
    },
  );

  result = result.replace(
    /<% for \((\w+) in (\w+)\) %>([\s\S]*?)<% endfor %>/g,
    (_match, itemVar, arrayVar, content) => {
      const items = data[arrayVar];
      if (!Array.isArray(items)) return "";

      return items.map((item) => {
        let itemContent = content;
        if (typeof item === "object" && item !== null) {
          Object.keys(item).forEach((key) => {
            itemContent = itemContent.replace(
              new RegExp(`<%= ${key} %>`, "g"),
              String(item[key]),
            );
          });
        } else {
          itemContent = itemContent.replace(
            new RegExp(`<%= ${itemVar} %>`, "g"),
            String(item),
          );
        }
        return itemContent;
      }).join("");
    },
  );

  return result;
}

export async function loadTemplate(templatePath: string): Promise<string> {
  try {
    return await Deno.readTextFile(templatePath);
  } catch (error) {
    console.error(`Error reading template ${templatePath}:`, error);
    throw error;
  }
}
