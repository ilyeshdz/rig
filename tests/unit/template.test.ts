import { assertEquals } from "@std/assert";
import { renderTemplate } from "../../src/core/template.ts";

Deno.test("renderTemplate - basic variable substitution", () => {
  const template = `<h1><%= title %></h1><p><%= content %></p>`;
  const data = { title: "Hello", content: "World" };

  const result = renderTemplate(template, data);

  assertEquals(result, "<h1>Hello</h1><p>World</p>");
});

Deno.test("renderTemplate - missing variable", () => {
  const template = `<h1><%= title %></h1>`;
  const data = { content: "World" };

  const result = renderTemplate(template, data);

  assertEquals(result, "<h1><%= title %></h1>");
});

Deno.test("renderTemplate - conditional blocks", () => {
  const template = `<% if (show) %><p>Visible</p><% endif %>`;
  const data = { show: true };

  const result = renderTemplate(template, data);

  assertEquals(result, "<p>Visible</p>");
});

Deno.test("renderTemplate - conditional blocks (false)", () => {
  const template = `<% if (show) %><p>Visible</p><% endif %>`;
  const data = { show: false };

  const result = renderTemplate(template, data);

  assertEquals(result, "");
});

Deno.test("renderTemplate - loop blocks", () => {
  const template = `<% for (item in items) %><li><%= item %></li><% endfor %>`;
  const data = { items: ["apple", "banana", "cherry"] };

  const result = renderTemplate(template, data);

  assertEquals(result, "<li>apple</li><li>banana</li><li>cherry</li>");
});

Deno.test("renderTemplate - empty array", () => {
  const template = `<% for (item in items) %><li><%= item %></li><% endfor %>`;
  const data = { items: [] };

  const result = renderTemplate(template, data);

  assertEquals(result, "");
});
