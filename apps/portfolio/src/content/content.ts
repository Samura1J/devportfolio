/**
 * All page copy lives here, so text can change without touching components.
 *
 * The mockup copy in design/ described features the apps don't have (pricing
 * tiers, seat reservation locks, Lighthouse scores, etc.); the project copy
 * below describes what the TypeScript rewrite actually does instead.
 */
import type {
  Capability,
  ContactCopy,
  EngagementPoint,
  NavItem,
  Profile,
  Project,
  Roadmap,
  SocialLink,
  TabItem,
} from "./types";

const GITHUB_URL = "https://github.com/Samura1J";
const LINKEDIN_URL = "https://www.linkedin.com/in/corey-joseph-5517a917/";
const REPO_URL = "https://github.com/Samura1J/devportfolio";
/** Each project's "View code" button opens its own folder in the repository. */
const repoPath = (path: string) => `${REPO_URL}/tree/main/${path}`;

export const navItems: NavItem[] = [
  { href: "#projects", label: "Featured Projects" },
  { href: "#capabilities", label: "Stack" },
  { href: "#engagement", label: "How I Work" },
  { href: "#contact", label: "Contact" },
];

export const tabItems: TabItem[] = [
  { href: "#hero", label: "Top", icon: "home" },
  { href: "#projects", label: "Projects", icon: "folder" },
  { href: "#capabilities", label: "Skills", icon: "terminal" },
  { href: "#contact", label: "Contact", icon: "mail" },
];

export const profile: Profile = {
  name: "Corey Joseph",
  initials: "CJ",
  role: "Full Stack & Frontend Dev",
  availability: {
    full: "Open to full-time roles & freelance product work",
    short: "Open to roles & freelance work",
  },
  headline: {
    full: "Building responsive frontend experiences with full-stack scalability.",
    short: "Building responsive web apps with full-stack scalability.",
  },
  introRest: {
    full: ", a web developer specializing in React interfaces, state-driven user flows, and typed Node backends. I help businesses turn product ideas into clean, reliable, accessible applications.",
    short: ", building React interfaces backed by typed Node APIs for product teams.",
  },
  // The mockup's "100% Client Delivery Focus" was replaced with claims the code backs up.
  metrics: [
    { value: "React + TS", label: "Frontend core" },
    { value: "Full Stack", label: "Node / Express / APIs", tone: "accent" },
    { value: "End-to-end types", label: "Shared schemas, strict TS", tone: "success" },
  ],
  profileCard: {
    filename: "engineer-profile.json",
    fields: {
      name: "Corey Joseph",
      focus: "Frontend & Backend Systems",
      strengths: [
        "Responsive UI Architecture",
        "REST API Design & Consumption",
        "Component State Management",
        "End-to-end TypeScript",
      ],
      current_learning: "PostgreSQL, Auth, Deployment",
      status: "Available for full-time & freelance",
    },
  },
  location: { label: "Primary location", value: "Remote / Hybrid · Atlanta, GA" },
};

export const projects: Project[] = [
  {
    slug: "weather",
    title: "Weather Forecast with Place Search",
    shortTitle: "Weather Forecast",
    summary: {
      full: "A 3-day forecast for any city, found with search-as-you-type. A typed Express proxy keeps the API key on the server, validates every upstream response, and caches forecasts for 30 minutes and searches for a day.",
      short: "3-day forecasts for any city, with search-as-you-type through a typed, cached Express proxy.",
    },
    badges: [
      { label: "React + TS", variant: "accent" },
      { label: "WeatherAPI.com", variant: "muted" },
    ],
    statusLabel: "v2 · Full-stack rewrite",
    highlightsIcon: "terminal",
    highlights: [
      "The API key never reaches the browser: every call goes through an Express proxy.",
      "Upstream responses are validated with zod and normalized into one shared type.",
      "An accessible combobox filters 56 built-in cities instantly and adds search results once typing pauses.",
      "Server caches serve repeat forecasts and searches without calling upstream.",
    ],
    stack: ["React 19", "TypeScript", "Express 5", "zod", "Tailwind CSS"],
    liveUrl: "/projects/weatherappv2/",
    liveLabel: "Launch Live",
    repoUrl: repoPath("apps/weather"),
    caseStudy: {
      heading: "Technical Case Study & Architecture",
      tags: ["React 19", "TypeScript", "WeatherAPI.com", "Express proxy"],
      status: "Live",
      intro:
        "A forecast app rebuilt from a browser-only React project into a small full-stack system: a typed proxy owns the API key, validation and caching, and the frontend renders one shared forecast type.",
      metrics: [
        { label: "Places", value: "Worldwide search" },
        { label: "Forecast", value: "3 days" },
        { label: "Server cache", value: "30 min" },
        { label: "API key exposure", value: "Server-only" },
      ],
      challenge:
        "Version 1 called a free weather API straight from the browser, parsed a CSV of cities client-side, and hand-converted units and compact date strings. Moving to a keyed API meant the key could no longer ship to the browser.",
      solution:
        "A thin Express proxy validates the coordinates, checks a per-location cache, fetches the forecast, parses it with zod, and maps all 60 of WeatherAPI's condition codes onto the app's 14 icons. It returns a DailyForecast type that the frontend imports from the same shared package.",
      evolution:
        "The rewrite moved the hard parts to the server: secrets, validation, caching and error mapping. The frontend now only handles loading, error and empty states, and the type checker enforces the contract on both sides.",
      snippet: {
        filename: "apps/api/src/clients/conditions.ts",
        language: "TypeScript",
        code: `// WeatherAPI condition codes grouped by the icon that shows them.
// Codes go up in steps of 3, so they're listed, not ranged.
const CODES_BY_CONDITION: Record<Condition, readonly number[]> = {
  clear: [1000],
  pcloudy: [1003],
  lightrain: [1063, 1150, 1153, 1180, 1183],
  tsrain: [1273, 1276, 1279, 1282],
  // ...14 icons, 60 codes; a test checks every code in
  // WeatherAPI's weather_conditions.json is mapped
};

export function toCondition(code: number): Condition {
  return CODE_TO_CONDITION.get(code) ?? "cloudy";
}`,
      },
    },
  },
  {
    slug: "seatpicker",
    title: "Movie Seat Picker & Checkout",
    shortTitle: "Seat Picker",
    summary: {
      full: "Pick one of today's trending films, choose seats on a 10×10 auditorium map, and pay through Stripe Checkout in test mode. The server holds the seats while you pay, so two people can't buy the same one.",
      short: "Trending films, a 10×10 seat map, and Stripe Checkout in test mode.",
    },
    badges: [
      { label: "React + TS", variant: "accent" },
      { label: "Stripe Checkout", variant: "muted" },
    ],
    statusLabel: "Live demo · Test mode",
    highlightsIcon: "code",
    highlights: [
      "Movies come live from TMDB and are cached on the server.",
      "The selection lives in the URL, so a refresh or a shared link keeps your seats.",
      "Seats are held in SQLite while you pay; a second buyer for the same seat is turned away.",
      "Seat IDs share one zod schema, and the server validates them before Stripe sees anything.",
    ],
    stack: ["React 19", "TypeScript", "React Router", "Express 5", "SQLite", "Stripe", "TMDB API"],
    liveUrl: "/projects/seatpicker/",
    liveLabel: "Launch Live",
    repoUrl: repoPath("apps/seatpicker"),
    caseStudy: {
      heading: "Checkout Flow & State Architecture",
      tags: ["React 19", "TypeScript", "Stripe Checkout", "TMDB API"],
      status: "Live demo",
      intro:
        "A ticketing flow from movie choice to payment: a typed seat map on the client, and a server that owns pricing and validation before handing off to Stripe Checkout.",
      metrics: [
        { label: "Seats", value: "100 (10×10)" },
        { label: "Payments", value: "Stripe Checkout" },
        { label: "Movies", value: "Live from TMDB" },
        { label: "Double booking", value: "Prevented" },
      ],
      challenge:
        "Version 1 kept the selection in router state, so a refresh lost it. It sent the movie title and seat count to a server that trusted both, created a new Stripe product on every checkout, and redirected to an internal hostname after payment.",
      solution:
        "Seat IDs are a template-literal type backed by a shared zod schema. The URL carries the movie ID and seats. The server resolves the movie from its own TMDB cache, rejects unknown or duplicate seats, builds the line item itself, and derives the return URLs from configuration.",
      evolution:
        "Seats are now real inventory. Starting checkout holds them in SQLite, where a primary key on (showing, seat) makes double booking impossible even when two requests arrive together; the loser is told which seats went. A hold lasts as long as its Stripe session. A signed webhook marks seats sold or frees them, and if no webhook arrives, the server asks Stripe before releasing an expired hold, so a paid seat is never resold.",
      snippet: {
        filename: "packages/shared/src/seatpicker.ts",
        language: "TypeScript",
        code: `// One schema validates seats in the browser and on the server
const SEAT_ID_PATTERN = /^(10|[1-9])[A-J]$/;

export const SeatIdSchema = z
  .string()
  .regex(SEAT_ID_PATTERN, "Unknown seat")
  .transform((value) => value as SeatId);

export const CheckoutRequestSchema = z.object({
  movieId: z.number().int().positive(),
  seats: z
    .array(SeatIdSchema)
    .min(1, "Pick at least one seat.")
    .max(MAX_SEATS_PER_ORDER)
    .refine((seats) => new Set(seats).size === seats.length,
      "Each seat can only be picked once."),
});`,
      },
    },
  },
];

/**
 * The "Currently Building" teaser under the projects. Hidden until there's a
 * public repository to link; to show it, set something like:
 *   { title: "Currently Building: …", status: "In Development",
 *     description: "…", link: { href: "<repo url>", label: "Track on GitHub" } }
 */
export const roadmap: Roadmap | undefined = undefined;

export const capabilities: Capability[] = [
  {
    title: "Frontend Architecture",
    icon: "devices",
    tone: "primary",
    blurb: "Responsive, accessible, component-driven client applications.",
    items: [
      { name: "React (Hooks, Router)", level: "Proficient", tone: "success" },
      { name: "TypeScript (strict)", level: "Proficient", tone: "success" },
      { name: "Tailwind CSS & Modern CSS", level: "Proficient", tone: "success" },
      { name: "Responsive & Accessible UI", level: "Proficient", tone: "success" },
    ],
  },
  {
    title: "Backend & APIs",
    icon: "server",
    tone: "accent",
    blurb: "Typed services that power frontends end-to-end.",
    items: [
      { name: "Node.js & Express", level: "Active Focus", tone: "accent" },
      { name: "REST API Design & zod Validation", level: "Active Focus", tone: "accent" },
      { name: "PostgreSQL & SQL", level: "Active Focus", tone: "accent" },
      { name: "Authentication & Middleware", level: "Active Focus", tone: "accent" },
    ],
  },
  {
    title: "Delivery & Quality",
    icon: "gauge",
    tone: "warning",
    blurb: "Fast pages, clean history, and checks that catch mistakes before users do.",
    items: [
      { name: "Git & GitHub Collaboration", level: "Active Focus", tone: "accent" },
      { name: "Vitest & Testing Library", level: "Active Focus", tone: "accent" },
      { name: "Vite & Modern Tooling", level: "Active Focus", tone: "accent" },
      { name: "Cross-Browser Consistency", level: "Active Focus", tone: "accent" },
    ],
  },
];

export const engagement = {
  eyebrow: "Collaboration & Engagement",
  title: "How I Partner with Hiring Managers & Business Owners",
  intro:
    "Whether joining an engineering team full-time or contracting on a focused build, here is what you can expect from day one.",
  points: [
    {
      title: "For Tech Teams & Hiring Managers",
      body: "I write clean, documented React and TypeScript that fits into existing codebases. I value clear communication, take review feedback seriously, and am growing into full-stack responsibilities as the team needs them.",
      tone: "primary",
    },
    {
      title: "For Freelance Clients & Small Businesses",
      body: "I don’t just write code. I help refine requirements, choose dependable hosting, and deliver fast, mobile-friendly pages. No confusing jargon, just steady progress updates and on-time launches.",
      tone: "accent",
    },
  ] satisfies EngagementPoint[],
};

export const socialLinks: SocialLink[] = [
  { kind: "linkedin", href: LINKEDIN_URL, label: "Connect on LinkedIn", handle: "in/corey-joseph-5517a917" },
  { kind: "github", href: GITHUB_URL, label: "Inspect Code on GitHub", handle: "github.com/Samura1J" },
];

export const contact: ContactCopy = {
  eyebrow: "Start a Conversation",
  title: "Let’s Build Something Great Together",
  intro:
    "Have an open engineering role, need an estimate on a web app, or want to review my code? Send a message, or reach out directly on GitHub or LinkedIn.",
  inquiryLabels: {
    "full-time": "Full-time engineering role",
    contract: "Contract / freelance web project",
    consultation: "Technical consultation",
    networking: "General networking",
  },
};

export const footer = {
  tagline: "Designed for performance and clean engineering.",
};
