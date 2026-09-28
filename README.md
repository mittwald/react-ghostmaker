# 👻 React Ghost Maker

Transform your async models into React Suspense-ready ghosts

React Ghost Maker creates intelligent proxy objects (ghosts) from your domain
models that seamlessly integrate with React Suspense and TanStack Query. These
ghosts automatically handle async operations, caching, and loading states,
making your code cleaner and more declarative.

## 📖 Table of Contents

- [✨ Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [🎭 Basic Usage](#-basic-usage)
- [🎨 Advanced Features](#-advanced-features)
- [🔄 Error Handling & Loading States](#-error-handling--loading-states)
- [🏗️ Working with Domain Models](#️-working-with-domain-models)
- [🎭 Flexible Component Props with MaybeReactGhost](#-flexible-component-props-with-maybereactghost)
- [🔧 Cache Management](#-cache-management)
- [📚 Complete Example](#-complete-example)
- [🔍 API Reference](#-api-reference)
- [🤝 Requirements](#-requirements)
- [📄 License](#-license)

## ✨ Features

🎭 **Ghost Proxies**: Transform any object—models, existing API clients,
services, or utilities into a suspense-ready ghost

- ⚡ **Lazy Execution**: Ghosts don't execute until `.use()` or `.render()` is
  called
- 🎯 **Precise Loading States**: Control exactly where Suspense boundaries
  trigger
- 🔄 **TanStack Query Integration**: Built-in caching and query management
- 🔑 **No Query Key Management**: Automatic query key generation - no manual key
  handling required
- 🛡️ **Type Safe**: Full TypeScript support with preserved method signatures
- 🔗 **Method Chaining**: Chain async method calls naturally
- 🎨 **Transform & Render**: Transform data and render components seamlessly
- 📦 **Minimal Dependencies**: Only peer dependencies on React and TanStack
  Query

## 🚀 Quick Start

### Installation

```bash
npm install @mittwald/react-ghostmaker @tanstack/react-query
# or
pnpm add @mittwald/react-ghostmaker @tanstack/react-query
```

### Setup

Wrap your app with TanStack Query's `QueryClientProvider`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
```

### Why React Ghost Maker?

**No More Query Key Management!** 🎉

With traditional TanStack Query, you need to manually manage query keys:

```tsx
// ❌ Traditional TanStack Query - Manual key management
function BlogComponent({ blogId }: { blogId: string }) {
  const { data: blog } = useQuery({
    queryKey: ["blog", blogId],
    queryFn: () => fetchBlog(blogId),
  });

  const { data: author } = useQuery({
    queryKey: ["blog", blogId, "author"],
    queryFn: () => fetchAuthor(blog.authorId),
    enabled: !!blog,
  });

  // More queries = more key management complexity...
}
```

With React Ghost Maker, query keys are handled automatically:

```tsx
// ✅ React Ghost Maker - Zero key management
function BlogComponent({ blogId }: { blogId: string }) {
  const blogGhost = BlogGhost.ofId(blogId);

  // Automatic query keys based on method chains
  const author = blogGhost.getDetailed().getAuthor().use();

  // No keys to manage, no dependencies to track!
}
```

**Lazy Execution & Precise Loading States!** ⚡

Ghosts are completely lazy - they don't execute until you call `.use()` or
`.render()`. This means you can:

- **Define ghosts anywhere** in your application
- **Pass them down** through component trees without triggering requests
- **Control exactly where** Suspense boundaries trigger
- **Create precise loading states** deep in your component hierarchy

```tsx
// ✅ Ghost creation is instant - no network request yet
function App() {
  const blogGhost = BlogGhost.ofId("123").getDetailed();

  return (
    <Layout>
      <Sidebar />
      <MainContent>
        {/* Suspense only triggers HERE when data is actually needed */}
        <Suspense fallback={<BlogSkeleton />}>
          <BlogDetails blog={blogGhost} />
        </Suspense>
      </MainContent>
    </Layout>
  );
}

function BlogDetails({ blog }: { blog: ReactGhost<DetailedBlog> }) {
  // Network request happens HERE, not in App component
  const blogData = blog.use();

  return <article>{blogData.title}</article>;
}

// vs. Traditional approach - immediate execution
function TraditionalApp() {
  // ❌ Query executes immediately, forces Suspense at top level
  const { data: blog } = useQuery({
    queryKey: ["blog", "123"],
    queryFn: () => fetchBlog("123"),
  });

  // Must handle loading at this level
  if (!blog) return <GlobalLoader />;

  return <Layout>...</Layout>;
}
```

## 🎭 Basic Usage

### Creating Your First Ghost

React Ghost Maker can turn any object into a ghost—not just domain models, but
also existing API clients, service objects, or utility classes. This makes it
easy to add Suspense and caching to legacy code or third-party libraries.

```tsx
import { makeGhost } from "@mittwald/react-ghostmaker";
import { Suspense } from "react";

// Example: Wrapping an API client
class BlogApiClient {
  async fetchBlog(id: string) {
    const response = await fetch(`/api/blogs/${id}`);
    return response.json();
  }
}

const BlogApiGhost = makeGhost(new BlogApiClient());

function BlogView() {
  // Use ghostified API client
  const blog = BlogApiGhost.fetchBlog("123").use();
  return <article>{blog.title}</article>;
}

// ...existing code...

// You can also use domain models as shown below:
class Blog {
  constructor(public id: string) {}
  static ofId(id: string): Blog {
    return new Blog(id);
  }
  async getDetailed() {
    const response = await fetch(`/api/blogs/${this.id}`);
    const data = await response.json();
    return new DetailedBlog(data);
  }
}

class DetailedBlog extends Blog {
  constructor(data: { id: string; title: string; author: string }) {
    super(data.id);
    this.title = data.title;
    this.author = data.author;
  }
  public readonly title: string;
  public readonly author: string;
}

const BlogGhost = makeGhost(Blog);

function BlogViewModel() {
  const blogGhost = BlogGhost.ofId("123");
  const { value: blogTitle, invalidate } = blogGhost
    .getDetailed()
    .title.transform((title) => title.toUpperCase())
    .useGhost();
  return (
    <article>
      <h2>{blogTitle}</h2>
      <button onClick={invalidate}>Refresh</button>
    </article>
  );
}

// Wrap with Suspense
function App() {
  return (
    <Suspense fallback={<div>Loading blog...</div>}>
      <BlogView />
      <BlogViewModel />
    </Suspense>
  );
}
```

### Method Chaining

Ghosts support natural method chaining for complex async operations:

```tsx
class BlogService {
  async getBlog(id: string) {
    return new Blog(id);
  }
}

class Blog {
  constructor(public id: string) {}

  async getAuthor() {
    const response = await fetch(`/api/blogs/${this.id}/author`);
    return new Author(await response.json());
  }
}

class Author {
  constructor(public data: any) {}

  async getProfile() {
    const response = await fetch(`/api/authors/${this.data.id}/profile`);
    return response.json();
  }
}

const BlogServiceGhost = makeGhost(new BlogService());

function BlogAuthorProfile() {
  // Chain multiple async operations seamlessly
  const authorProfile = BlogServiceGhost.getBlog("123")
    .getAuthor()
    .getProfile()
    .use();

  return <div>{authorProfile.bio}</div>;
}
```

## 🎨 Advanced Features

### Transform Data

Transform your data before rendering:

```tsx
function BlogTitle() {
  const blogGhost = BlogGhost.ofId("123");

  const title = blogGhost
    .getDetailed()
    .title.transform((title) => title.toUpperCase())
    .use();

  return <h1>{title}</h1>;
}
```

### Render Method

Use the `render` method for inline rendering:

```tsx
function BlogContent() {
  const blogGhost = BlogGhost.ofId("123");

  return <div>{blogGhost.getDetailed().title.render()}</div>;
}
```

### Custom Query Options

Pass TanStack Query options for fine-grained control:

```tsx
function CachedBlogData() {
  const blogGhost = BlogGhost.ofId("123");

  const blogData = blogGhost.getDetailed().use({
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    refetchOnWindowFocus: false,
  });

  return <div>{blogData.title}</div>;
}
```

### Access Query State with useGhost

Use `useGhost` for full query state access and invalidation:

```tsx
function BlogWithControls() {
  const blogGhost = BlogGhost.ofId("123");

  const { value: blogData, invalidate } = blogGhost.getDetailed().useGhost({
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div>
      <h1>{blogData.title}</h1>
      <p>By: {blogData.author}</p>
      <button onClick={invalidate}>Refresh Blog</button>
    </div>
  );
}
```

### Direct Await Outside React

You can directly await ghosts outside of React components for imperative
operations:

```tsx
const BlogGhost = makeGhost(Blog);

// Direct await for form submission
async function handleBlogUpdate(blogId: string, updates: any) {
  try {
    const blogGhost = BlogGhost.ofId(blogId);
    const blogData = await blogGhost.getDetailed();

    await updateBlog(blogData.id, updates);

    // Invalidate cache after update
    invalidateGhostsById(`blog-${blogData.id}`);
  } catch (error) {
    console.error("Failed to update blog:", error);
  }
}

// Use in event handlers
function DeleteButton() {
  const blogGhost = BlogGhost.ofId("123");

  const handleDelete = async () => {
    if (confirm("Are you sure?")) {
      const blog = await blogGhost;
      await deleteBlog(blog.id);
      invalidateGhostsById(`blog-${blog.id}`);
    }
  };

  return <button onClick={handleDelete}>Delete Blog</button>;
}
```

## 🔄 Error Handling & Loading States

### Error Boundaries

Handle errors with React Error Boundaries:

```tsx
import { ErrorBoundary } from "react-error-boundary";

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div role="alert">
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

function App() {
  const blogGhost = BlogGhost.ofId("123");

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<div>Loading...</div>}>
        <BlogView />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Nested Suspense Boundaries

Create granular loading states with nested Suspense:

```tsx
function BlogPage() {
  const blogGhost = BlogGhost.ofId("123");

  return (
    <article>
      <Suspense fallback={<div>Loading title...</div>}>
        <BlogTitle ghost={blogGhost} />
      </Suspense>

      <Suspense fallback={<div>Loading content...</div>}>
        <BlogContent ghost={blogGhost} />
      </Suspense>

      <Suspense fallback={<div>Loading author...</div>}>
        <BlogAuthor ghost={blogGhost} />
      </Suspense>
    </article>
  );
}
```


## 🏗️ Working with Domain Models

### Model Identification

#### Using the `GhostMakerModel` Decorator (Recommended)

You can now use the `GhostMakerModel` decorator to define model names and IDs for automatic query key generation. This is the recommended and most convenient way to ensure stable and meaningful cache keys for your models.

```tsx
import { GhostMakerModel } from "@mittwald/react-ghostmaker";

@GhostMakerModel({
  name: "User",
  getId: (user) => user.id,
})
class User {
  constructor(
    public id: string,
    public name: string,
  ) {}
}

@GhostMakerModel({
  name: "Blog",
  getId: (blog) => blog.id,
})
class Blog {
  constructor(
    public id: string,
    public title: string,
  ) {}
}
```

**Advantages:**

- Declarative, directly on the model class
- No need for central registration
- Name and ID can be set explicitly (for readable query keys)
- Works for multiple models and inheritance

#### Framework-agnostic model code

If your models live in code that must not depend on React (a shared model
package, server-side or CLI code), import the decorator from the
`@mittwald/react-ghostmaker/model` entry point instead of the main entry:

```ts
import { GhostMakerModel } from "@mittwald/react-ghostmaker/model";
```

This entry point only contains what is needed to describe models —
`GhostMakerModel`, `ghostMakerModel`, `getModelName`, `getModelId` and the
`GhostMakerModelMeta` and `DynamicModel` types — and imports neither React nor
TanStack Query, not even for its type declarations. `react` and
`@tanstack/react-query` are therefore optional peer dependencies: you only need
them where you import from the main entry (`@mittwald/react-ghostmaker`), i.e.
where you actually create and use ghosts.

Both entry points share the same model registry, so models decorated via
`/model` are recognized by ghosts created via the main entry.

#### Alternative: `registerModelIdentifier` (deprecated)

The previous `registerModelIdentifier` function is still available but marked as deprecated. It can be used to centrally register IDs for models:

```tsx
import { registerModelIdentifier } from "@mittwald/react-ghostmaker";

registerModelIdentifier((model) => {
  if (model instanceof User) return `user-${model.id}`;
  if (model instanceof Blog) return `blog-${model.id}`;
  return undefined;
});
```

> **Note:** Prefer the `GhostMakerModel` decorator for new projects.

## 🎭 Flexible Component Props with MaybeReactGhost

The `MaybeReactGhost` pattern allows your components to accept both ghost
objects and regular objects, making them more flexible and reusable.

### Basic Usage

Use `MaybeReactGhost<T>` for component props that should work with both ghosts
and regular objects:

```tsx
import { type MaybeReactGhost, asGhostProps } from "@mittwald/react-ghostmaker";

interface Props {
  blog: MaybeReactGhost<Blog>;
}

function BlogCard(props: Props) {
  // Automatically handles both ghost and regular objects
  const { blogGhost } = asGhostProps(props);

  return (
    <div>
      {blogGhost.getDetailed().title.render()}
    </div>
  );
}

// Works with both ghosts and regular objects
<BlogCard blog={BlogGhost.ofId("123")} />
<BlogCard blog={new Blog("123")} />
```

### Advanced Patterns

You can build more complex component hierarchies where data can be passed down
either as resolved values or as ghosts:

```tsx
// This component can work with both resolved and unresolved blog data
function BlogDisplay(props: { blog: MaybeReactGhost<Blog> }) {
  const { blogGhost } = asGhostProps(props);

  const { value: blogData, invalidate } = blogGhost.getDetailed().useGhost();

  return (
    <article>
      <h1>{blogData.title}</h1>
      <p>By: {blogData.author}</p>
      <button onClick={invalidate}>Refresh</button>
      {/* Pass down as props - can be either resolved or ghost */}
      <BlogComments blog={blogGhost} />
      <BlogSidebar blog={blogData} /> {/* Already resolved */}
    </article>
  );
}

function BlogComments(props: { blog: MaybeReactGhost<Blog> }) {
  const { blogGhost } = asGhostProps(props);
  const comments = blogGhost.getComments().use();

  return (
    <div>
      {comments.map((comment) => (
        <div key={comment.id}>{comment.text}</div>
      ))}
    </div>
  );
}

function BlogSidebar(props: { blog: Blog }) {
  // This component expects resolved data
  return (
    <aside>
      <h3>About this blog</h3>
      <p>Blog ID: {props.blog.id}</p>
    </aside>
  );
}
```

### When to Use MaybeReactGhost

Use `MaybeReactGhost<T>` when:

- You want components that can work with both async (ghost) and sync (regular)
  data
- Building reusable components that might receive data in different loading
  states
- Creating component libraries that should be flexible about data sources
- Passing data down component trees where some levels might resolve the data
  early

Don't use it when:

- You always know the data will be a ghost (use `ReactGhost<T>` directly)
- You always know the data will be resolved (use the plain type `T`)
- Simple components that don't need this flexibility

## 🔧 Cache Management

### Invalidate Queries

#### Using `useGhost` Hook

The `useGhost` hook returns an `invalidate` function for refreshing specific
ghost data:

```tsx
function BlogView() {
  const blogGhost = BlogGhost.ofId("123");

  const { value: blogData, invalidate } = blogGhost.getDetailed().useGhost();

  const handleRefresh = () => {
    invalidate(); // Refreshes only this specific ghost chain
  };

  return (
    <div>
      <h1>{blogData.title}</h1>
      <button onClick={handleRefresh}>Refresh Blog</button>
    </div>
  );
}
```

#### Using Ghost's `invalidate` Method

Each ghost has an `invalidate` method that requires a QueryClient:

```tsx
import { useQueryClient } from "@tanstack/react-query";

function UpdateBlogButton() {
  const blogGhost = BlogGhost.ofId("123");
  const queryClient = useQueryClient();

  const handleUpdate = async () => {
    const blogData = await blogGhost.getDetailed();
    await updateBlog(blogData.id, { title: "Updated Title" });

    // Invalidate this specific ghost
    blogGhost.invalidate(queryClient);
  };

  return <button onClick={handleUpdate}>Update Blog</button>;
}
```

#### Global Invalidation by ID

Use `invalidateGhostsById` for global cache invalidation:

```tsx
import { invalidateGhostsById } from "@mittwald/react-ghostmaker";

async function deleteBlog(blogId: string) {
  await fetch(`/api/blogs/${blogId}`, { method: "DELETE" });

  // Invalidate all cached data for this blog
  invalidateGhostsById(`blog-${blogId}`);
}
```

## 📚 Complete Example

Here's a comprehensive example showing a blog application:

```tsx
// models/Blog.ts
export class Blog {
  constructor(public id: string) {}

  static ofId(id: string): Blog {
    return new Blog(id);
  }

  async getDetailed() {
    const response = await fetch(`/api/blogs/${this.id}`);
    const data = await response.json();
    return new DetailedBlog(data);
  }
}

export class DetailedBlog extends Blog {
  constructor(data: { id: string; title: string; author: string }) {
    super(data.id);
    this.title = data.title;
    this.author = data.author;
  }

  public readonly title: string;
  public readonly author: string;

  async getAuthor() {
    const response = await fetch(`/api/authors/${this.author}`);
    return response.json();
  }
}

// models/react/BlogGhost.ts
import { makeGhost, type ReactGhost } from "@mittwald/react-ghostmaker";
import { Blog } from "../Blog";

export const BlogGhost = makeGhost(Blog);
export type BlogGhostType = ReactGhost<Blog>;

// models/react/init.ts
import { registerModelIdentifier } from "@mittwald/react-ghostmaker";
import { Blog, DetailedBlog } from "../Blog";

registerModelIdentifier((model) => {
  if (model instanceof Blog) return `blog-${model.id}`;
  if (model instanceof DetailedBlog) return `detailed-blog-${model.id}`;
  return undefined;
});

// components/BlogPage.tsx
import { Suspense } from "react";
import { type ReactGhost } from "@mittwald/react-ghostmaker";
import { Blog } from "../models/Blog";

function BlogPage() {
  const blogGhost = BlogGhost.ofId("123");

  return (
    <article>
      <Suspense fallback={<div>Loading title...</div>}>
        <BlogTitle ghost={blogGhost} />
      </Suspense>

      <Suspense fallback={<div>Loading author...</div>}>
        <BlogAuthor ghost={blogGhost} />
      </Suspense>
    </article>
  );
}

function BlogTitle(props: { ghost: ReactGhost<Blog> }) {
  const { value: title, invalidate } = props.ghost
    .getDetailed()
    .title.transform((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .useGhost();

  return (
    <div>
      <h1>{title}</h1>
      <button onClick={invalidate}>Refresh Title</button>
    </div>
  );
}

function BlogAuthor(props: { ghost: ReactGhost<Blog> }) {
  const author = props.ghost.getDetailed().getAuthor().use();

  return (
    <div>
      <h3>By: {author.name}</h3>
      <p>{author.bio}</p>
    </div>
  );
}

// App.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import BlogPage from "./components/BlogPage";
import { BlogGhost } from "./models/react/BlogGhost";
import "./models/react/init"; // Initialize model identifiers

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div>
      <h2>Oops! Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={resetErrorBoundary}>Try Again</button>
    </div>
  );
}

export default function App() {
  const blogGhost = BlogGhost.ofId("123");

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <BlogPage />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
```

## 🔍 API Reference

### `makeGhost<T>(model: T): ReactGhost<T>`

Creates a ghost proxy from any object or class instance.

**Key Benefits:**

- 🔑 **Automatic Query Keys**: Generated based on method chains and model
  identifiers
- 🔄 **Smart Caching**: Each method call in a chain creates a unique,
  deterministic cache key
- 🎯 **Type Safety**: Preserves all original method signatures and return types

### Ghost Methods

- **`.use(options?)`** - Suspends until data is available, returns the resolved
  value
- **`.useGhost(options?)`** - Returns `{ value, invalidate }` with full query
  control
- **`.render(transform?)`** - Renders the value directly as a React element
- **`.transform(fn, deps?)`** - Transforms the resolved value
- **`.invalidate(queryClient)`** - Invalidate this specific ghost's cached data
- **`await ghost`** - Directly await the ghost to get the resolved value


### Utility Functions

- **`asGhostProps(props)`** - Converts props to ghost-compatible format
- **`GhostMakerModel(options)`** - Decorator to define model name and ID for automatic query key generation
- **`invalidateGhostsById(id)`** - Globally invalidate cached data by ID
- **`getGhostId(ghost)`** - Get the unique ID of a ghost

### Types

- **`MaybeReactGhost<T>`** - Type for props that accept both ghosts and regular objects
- **`ReactGhost<T>`** - Type for ghost proxy objects
- **`UseGhostReturn<T>`** - Return type of `useGhost()` with `{ value, invalidate }`

## 🤝 Requirements

- React >=19.2
- TanStack Query ^5
- TypeScript (recommended)

React and TanStack Query are only required for the main entry point, not for
[`@mittwald/react-ghostmaker/model`](#framework-agnostic-model-code).

## 📄 License

MIT © [Mittwald CM Service GmbH & Co. KG](https://github.com/mittwald)

---

**Ready to make your async operations disappear like ghosts? 👻** Transform your
React app with suspense-ready domain models today!
