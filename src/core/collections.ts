import type {
  Collection,
  Config,
  ContentFile,
  PaginatedContent,
  Taxonomy,
  TaxonomyTerm,
} from "../types/index.ts";

export class CollectionManager {
  private config: Config;
  private collections: Map<string, Collection> = new Map();

  constructor(config: Config) {
    this.config = config;
  }

  processCollections(files: ContentFile[]): Collection[] {
    // Initialize collections from config
    this.initializeCollections();

    // Assign files to collections
    this.assignFilesToCollections(files);

    // Sort collections
    this.sortCollections();

    // Filter drafts if needed
    this.filterDrafts();

    return Array.from(this.collections.values());
  }

  private initializeCollections(): void {
    if (!this.config.collections) {
      // Default collection for all files
      this.collections.set("pages", {
        name: "pages",
        config: {
          name: "pages",
          sortBy: "date",
          sortOrder: "desc",
          excludeDrafts: false,
        },
        files: [],
      });
      return;
    }

    for (const [name, config] of Object.entries(this.config.collections)) {
      this.collections.set(name, {
        name,
        config: { ...config, name },
        files: [],
      });
    }
  }

  private assignFilesToCollections(files: ContentFile[]): void {
    for (const file of files) {
      const collectionName = file.frontMatter.collection ||
        this.getCollectionFromPath(file.filePath) || "pages";

      if (this.collections.has(collectionName)) {
        const collection = this.collections.get(collectionName)!;
        collection.files.push(file);
        file.collection = collectionName;
      } else {
        // Add to default pages collection if collection doesn't exist
        const pagesCollection = this.collections.get("pages");
        if (pagesCollection) {
          pagesCollection.files.push(file);
          file.collection = "pages";
        }
      }
    }
  }

  private getCollectionFromPath(filePath: string): string | null {
    // Extract collection from directory structure
    const parts = filePath.split("/");
    if (parts.length > 1) {
      return parts[0];
    }
    return null;
  }

  private sortCollections(): void {
    for (const collection of this.collections.values()) {
      const { sortBy = "date", sortOrder = "desc" } = collection.config;

      collection.files.sort((a, b) => {
        let aValue: string | number | boolean | string[] | undefined =
          a.frontMatter[sortBy];
        let bValue: string | number | boolean | string[] | undefined =
          b.frontMatter[sortBy];

        // Handle undefined values
        aValue = aValue || "";
        bValue = bValue || "";

        // Handle dates
        if (sortBy === "date") {
          aValue = typeof aValue === "string" ? new Date(aValue).getTime() : 0;
          bValue = typeof bValue === "string" ? new Date(bValue).getTime() : 0;
        }

        // Handle numbers
        if (typeof aValue === "string" && !isNaN(Number(aValue))) {
          aValue = Number(aValue);
        }
        if (typeof bValue === "string" && !isNaN(Number(bValue))) {
          bValue = Number(bValue);
        }

        let comparison = 0;
        if ((aValue as number) < (bValue as number)) comparison = -1;
        else if ((aValue as number) > (bValue as number)) comparison = 1;

        return sortOrder === "desc" ? -comparison : comparison;
      });
    }
  }

  private filterDrafts(): void {
    for (const collection of this.collections.values()) {
      if (collection.config.excludeDrafts) {
        collection.files = collection.files.filter((file) => {
          const draft = file.frontMatter.draft;
          return draft !== true && draft !== "true";
        });
      }
    }
  }

  getCollection(name: string): Collection | undefined {
    return this.collections.get(name);
  }

  getAllCollections(): Collection[] {
    return Array.from(this.collections.values());
  }

  // Pagination
  paginateCollection(
    collection: Collection,
    page: number = 1,
  ): PaginatedContent {
    const { perPage = 10 } = collection.config;
    const totalPages = Math.ceil(collection.files.length / perPage);
    const currentPage = Math.max(1, Math.min(page, totalPages));

    const startIndex = (currentPage - 1) * perPage;
    const endIndex = startIndex + perPage;
    const files = collection.files.slice(startIndex, endIndex);

    return {
      files,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      nextPagePath: currentPage < totalPages
        ? `${collection.name}/page/${currentPage + 1}`
        : undefined,
      prevPagePath: currentPage > 1
        ? (currentPage === 2
          ? collection.name
          : `${collection.name}/page/${currentPage - 1}`)
        : undefined,
    };
  }

  // Taxonomy support
  createTaxonomy(collection: Collection, field: "tags" | "category"): Taxonomy {
    const termMap = new Map<string, TaxonomyTerm>();

    for (const file of collection.files) {
      const values = file.frontMatter[field];
      if (!values) continue;

      const terms = Array.isArray(values) ? values : [values];

      for (const term of terms) {
        if (!term || typeof term !== "string") continue;

        const slug = term.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(
          /^-+|-+$/g,
          "",
        );

        if (!termMap.has(slug)) {
          termMap.set(slug, {
            name: term,
            slug,
            count: 0,
            files: [],
          });
        }

        const taxonomyTerm = termMap.get(slug)!;
        taxonomyTerm.count++;
        taxonomyTerm.files.push(file);
      }
    }

    // Sort terms by count (descending) then by name
    const terms = Array.from(termMap.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });

    return {
      name: field,
      terms,
    };
  }

  getAllTags(collection: Collection): Taxonomy {
    return this.createTaxonomy(collection, "tags");
  }

  getAllCategories(collection: Collection): Taxonomy {
    return this.createTaxonomy(collection, "category");
  }

  getFilesByTag(collection: Collection, tag: string): ContentFile[] {
    const taxonomy = this.getAllTags(collection);
    const term = taxonomy.terms.find((t) => t.slug === tag || t.name === tag);
    return term ? term.files : [];
  }

  getFilesByCategory(collection: Collection, category: string): ContentFile[] {
    const taxonomy = this.getAllCategories(collection);
    const term = taxonomy.terms.find((t) =>
      t.slug === category || t.name === category
    );
    return term ? term.files : [];
  }
}
