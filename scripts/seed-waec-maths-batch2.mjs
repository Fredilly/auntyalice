/**
 * WAEC Mathematics — batch 2. Three complete V2 lessons published through the real
 * review flow (submitted → approved → published). Runs against whatever DATABASE_URL
 * points at; refuses fixture slugs and a missing reviewer.
 *
 * Publish to development now, production once staff identities exist.
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import pg from "pg";

const CHECKLIST = JSON.stringify({ accuracy: true, answerKeys: true, rights: true, safeguarding: true, accessibility: true });
const FIXTURES = /^(m2-|isolation-|test-|fixture-)/;

const LESSONS = [
  {
    slug: "quadratic-equations",
    title: "Quadratic Equations",
    examTracks: ["waec"],
    blocks: [
      { type: "objectives", items: [
        "Solve a quadratic by factorising when the roots are whole numbers",
        "Use the quadratic formula when factorising does not work",
        "Read the discriminant to say how many solutions exist",
      ]},
      { type: "section", heading: "The shape of the equation", paras: [
        "A quadratic equation has an $x^2$ term and is written $ax^2 + bx + c = 0$, where $a$ is not zero.",
        "Solving it means finding the values of $x$ that make the statement true. There can be two, one, or none.",
      ], math: "ax^2 + bx + c = 0" },
      { type: "section", heading: "Method 1 — factorising", paras: [
        "Find two numbers that multiply to $c$ and add to $b$. Then split the expression into two brackets and set each bracket to zero.",
      ], note: "This is the fastest method, but only when the numbers are friendly." },
      { type: "worked", title: "Solve x² − 5x + 6 = 0", steps: [
        { text: "We need two numbers that multiply to 6 and add to −5." },
        { text: "Those numbers are −2 and −3.", math: "(-2) \\times (-3) = 6, \\quad (-2) + (-3) = -5" },
        { text: "Write the factorised form.", math: "(x - 2)(x - 3) = 0" },
        { text: "A product is zero when either bracket is zero.", math: "x - 2 = 0 \\quad \\text{or} \\quad x - 3 = 0" },
      ], answer: "So $x = 2$ or $x = 3$." },
      { type: "section", heading: "Method 2 — the quadratic formula", paras: [
        "When the numbers do not factorise neatly, use the formula. It works every time.",
      ], math: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" },
      { type: "section", heading: "The discriminant", paras: [
        "The part under the square root, $b^2 - 4ac$, tells you how many solutions exist before you solve anything.",
        "If it is positive there are two solutions, if it is zero there is one, and if it is negative there are none in real numbers.",
      ], math: "\\Delta = b^2 - 4ac" },
      { type: "mistakes", items: [
        { wrong: "Forgetting the sign: writing the formula as $-b + \\sqrt{}$ only", why: "The $\\pm$ gives two answers. Taking one branch loses half the solution.", right: "Work both branches: $\\frac{-b + \\sqrt{\\Delta}}{2a}$ and $\\frac{-b - \\sqrt{\\Delta}}{2a}$." },
        { wrong: "Reading $a$, $b$, $c$ straight from the equation without the sign", why: "In $x^2 - 5x + 6$, $b$ is $-5$, not $5$. Sign errors here cause most lost marks.", right: "Write $a$, $b$ and $c$ on the page before substituting." },
        { wrong: "Stopping after factorising", why: "The question asks for $x$, not for the brackets. A factorised expression is working, not an answer.", right: "Set each bracket to zero and state both values of $x$." },
      ]},
      { type: "practice", questions: [
        { id: "q1", prompt: "Solve $x^2 - 5x + 6 = 0$.", options: ["$x = 2$ or $x = 3$", "$x = -2$ or $x = -3$", "$x = 1$ or $x = 6$", "$x = 5$ or $x = 6$"], answer: 0,
          explanation: "−2 and −3 multiply to 6 and add to −5, so $(x-2)(x-3)=0$ and $x = 2$ or $3$." },
        { id: "q2", prompt: "What is the discriminant of $2x^2 + 3x - 5 = 0$?", options: ["$-31$", "$49$", "$9$", "$-49$"], answer: 1,
          explanation: "$b^2 - 4ac = 3^2 - 4(2)(-5) = 9 + 40 = 49$. Positive, so there are two real solutions." },
        { id: "q3", prompt: "A quadratic has discriminant $-4$. How many real solutions does it have?", options: ["Two", "One", "None", "Infinitely many"], answer: 2,
          explanation: "A negative discriminant means the square root is not real, so there are no real solutions." },
        { id: "q4", prompt: "Solve $x^2 - 9 = 0$.", options: ["$x = 3$ only", "$x = 3$ or $x = -3$", "$x = 9$", "$x = -9$"], answer: 1,
          explanation: "$x^2 = 9$ has two solutions because both $3^2$ and $(-3)^2$ equal 9." },
        { id: "q5", prompt: "In $3x^2 - 4x + 1 = 0$, what is $c$?", options: ["$3$", "$-4$", "$1$", "$0$"], answer: 2,
          explanation: "The constant term is $1$; $3$ is $a$ and $-4$ is $b$." },
      ]},
    ],
  },

  {
    slug: "simple-interest",
    title: "Simple Interest",
    examTracks: ["waec"],
    blocks: [
      { type: "objectives", items: [
        "Use the simple interest formula to find interest, principal, rate or time",
        "Find the total amount repaid, not just the interest",
        "Recognise the difference between simple and compound interest",
      ]},
      { type: "section", heading: "What interest is", paras: [
        "Interest is the price of borrowing money, or the reward for saving it. Simple interest is calculated only on the original amount, so it grows by the same amount every year.",
      ], math: "I = \\frac{P \\times R \\times T}{100}" },
      { type: "section", heading: "The four letters", paras: [
        "$P$ is the principal — the money you started with. $R$ is the rate per year, as a percentage. $T$ is the time in years. $I$ is the interest earned.",
        "The amount you end up with is the principal plus the interest.",
      ], math: "A = P + I" },
      { type: "worked", title: "₦25,000 at 8% for 3 years", steps: [
        { text: "Write what you know.", math: "P = 25000, \\quad R = 8, \\quad T = 3" },
        { text: "Substitute into the formula.", math: "I = \\frac{25000 \\times 8 \\times 3}{100}" },
        { text: "Multiply first, then divide by 100.", math: "I = \\frac{600000}{100} = 6000" },
      ], answer: "The interest is ₦6,000, so the total amount is ₦31,000." },
      { type: "section", heading: "Working backwards", paras: [
        "The same formula rearranges. If a question gives you the interest and asks for the rate or the time, solve for the missing letter instead of starting again.",
      ], math: "R = \\frac{100I}{PT}, \\quad T = \\frac{100I}{PR}" },
      { type: "mistakes", items: [
        { wrong: "Giving the interest when the question asked for the amount", why: "Interest and amount are different numbers. Half the marks are usually for the total.", right: "Add the principal: $A = P + I$." },
        { wrong: "Leaving time in months", why: "The formula uses years. Six months is $0.5$, and three months is $0.25$.", right: "Convert first: $T = \\frac{\\text{months}}{12}$." },
        { wrong: "Dividing by 100 twice", why: "The rate is already a percentage; one division by 100 is enough.", right: "Substitute the rate as a plain number, for example 8." },
      ]},
      { type: "practice", questions: [
        { id: "q1", prompt: "Find the simple interest on ₦25,000 at 8% for 3 years.", options: ["₦2,000", "₦6,000", "₦31,000", "₦20,000"], answer: 1,
          explanation: "$I = (25000 \\times 8 \\times 3) / 100 = 6000$." },
        { id: "q2", prompt: "₦25,000 at 8% for 3 years — what is the total amount?", options: ["₦6,000", "₦25,000", "₦31,000", "₦56,000"], answer: 2,
          explanation: "Amount $= P + I = 25000 + 6000 = 31000$." },
        { id: "q3", prompt: "What is 6 months in years, for the formula?", options: ["$6$", "$0.5$", "$1.2$", "$2$"], answer: 1,
          explanation: "Six months is half a year: $6/12 = 0.5$." },
        { id: "q4", prompt: "₦40,000 earns ₦4,800 in 2 years. What is the rate?", options: ["$4\\%$", "$6\\%$", "$8\\%$", "$12\\%$"], answer: 1,
          explanation: "$R = 100I / (PT) = (100 \\times 4800) / (40000 \\times 2) = 480000/80000 = 6\\%$." },
        { id: "q5", prompt: "Which grows faster over five years?", options: ["Simple interest", "Compound interest", "They are equal", "Neither grows"], answer: 1,
          explanation: "Compound interest earns interest on the interest, so it overtakes simple interest." },
      ]},
    ],
  },

  {
    slug: "mean-median-mode",
    title: "Mean, Median and Mode",
    examTracks: ["waec"],
    blocks: [
      { type: "objectives", items: [
        "Calculate the mean of a small data set",
        "Find the median by ordering the values first",
        "Identify the mode, including when there is none",
      ]},
      { type: "section", heading: "Three ways to say average", paras: [
        "The mean is the total divided by how many. The median is the middle value once the numbers are in order. The mode is the value that appears most often.",
      ], math: "\\text{mean} = \\frac{\\text{sum of values}}{\\text{number of values}}" },
      { type: "worked", title: "For the data 4, 7, 7, 9, 13", steps: [
        { text: "Add them up.", math: "4 + 7 + 7 + 9 + 13 = 40" },
        { text: "Divide by how many there are.", math: "\\text{mean} = \\frac{40}{5} = 8" },
        { text: "For the median, the values are already in order and there are five of them, so the middle one is the third.", math: "\\text{median} = 7" },
        { text: "The mode is the value that appears most often." },
      ], answer: "Mean $8$, median $7$, mode $7$." },
      { type: "section", heading: "Even numbers of values", paras: [
        "With an even count there is no single middle value. Take the two in the middle, add them, and halve.",
      ], math: "\\text{median} = \\frac{a + b}{2}" },
      { type: "mistakes", items: [
        { wrong: "Finding the median without sorting", why: "The median is positional. Unsorted, you are just picking a random number.", right: "Order the list first, always." },
        { wrong: "Assuming there is always a mode", why: "If every value appears once, there is no mode. If two values tie, both are modes.", right: "Check the frequencies before answering." },
        { wrong: "Saying the mean must be one of the numbers in the list", why: "The mean can be a value that never appears, like 8 in the example above.", right: "The mean is a calculated centre, not a member of the set." },
      ]},
      { type: "practice", questions: [
        { id: "q1", prompt: "Find the mean of 4, 7, 7, 9, 13.", options: ["$7$", "$8$", "$9$", "$40$"], answer: 1,
          explanation: "Sum is 40 and there are 5 values, so the mean is $40/5 = 8$." },
        { id: "q2", prompt: "Find the median of 4, 7, 7, 9, 13.", options: ["$7$", "$8$", "$9$", "$13$"], answer: 0,
          explanation: "Ordered with five values, the middle (third) value is 7." },
        { id: "q3", prompt: "Find the median of 3, 5, 8, 10.", options: ["$5$", "$6.5$", "$8$", "$7$"], answer: 1,
          explanation: "Two middle values 5 and 8: $(5+8)/2 = 6.5$." },
        { id: "q4", prompt: "What is the mode of 2, 3, 3, 5, 8, 8, 9?", options: ["$3$ only", "$8$ only", "$3$ and $8$", "No mode"], answer: 2,
          explanation: "Both 3 and 8 appear twice, more than any other value, so both are modes." },
        { id: "q5", prompt: "A set where every value appears exactly once has…", options: ["one mode", "two modes", "no mode", "median equal to mean"], answer: 2,
          explanation: "With no repeated value there is no mode." },
      ]},
    ],
  },
];

const line = readFileSync(process.env.HOME + "/.config/auntyalice/dev.env", "utf8")
  .split("\n").find((x) => x.startsWith("DATABASE_URL="));
const url = process.env.DATABASE_URL || line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");

const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
await c.connect();

const teacher = (await c.query("select id, auth_subject from academy.staff where role='teacher' and active limit 1")).rows[0];
const reviewer = (await c.query("select auth_subject from academy.staff where role='reviewer' and active limit 1")).rows[0]?.auth_subject;
if (!teacher || !reviewer) { console.error("need an active teacher and reviewer"); process.exit(1); }

let published = 0;
for (const lesson of LESSONS) {
  if (FIXTURES.test(lesson.slug)) { console.warn("skip fixture", lesson.slug); continue; }

  const existing = (await c.query("select id from academy.lessons where slug=$1", [lesson.slug])).rows[0];
  const lessonId = existing?.id ?? randomUUID();
  if (!existing) await c.query("insert into academy.lessons(id, slug, owner_id) values ($1,$2,$3)", [lessonId, lesson.slug, teacher.id]);

  const version = (await c.query("select coalesce(max(version),0)+1 v from academy.revisions where lesson_id=$1", [lessonId])).rows[0].v;
  const revisionId = randomUUID();
  const practice = lesson.blocks.find((b) => b.type === "practice");

  await c.query("begin");
  await c.query(
    "insert into academy.revisions(id, lesson_id, version, author_id, content) values ($1,$2,$3,$4,$5)",
    [revisionId, lessonId, version, teacher.id, JSON.stringify({
      title: lesson.title, slug: lesson.slug, examTracks: lesson.examTracks, videoId: null,
      notes: "Structured V2 lesson: objectives, worked examples, common mistakes, explained practice.",
      questions: practice?.questions ?? [], blocks: lesson.blocks,
    })],
  );
  await c.query(
    `insert into academy.syllabus_mappings(revision_id, exam, syllabus_edition, objective_reference, source_url)
     values ($1,'waec','2021-2025',$2,'https://www.waecnigeria.org/')`,
    [revisionId, lesson.title],
  );
  for (const action of ["submitted", "approved", "published"]) {
    const subject = action === "submitted" ? teacher.auth_subject : reviewer;
    await c.query("select academy.advance_review($1,$2,$3,$4,$5::jsonb)", [
      subject, revisionId, action, action === "approved" ? "reviewed" : "", CHECKLIST,
    ]);
  }
  await c.query("commit");
  published++;
  console.log("published", lesson.slug, "v" + version);
}

console.log({ published, public: (await c.query("select slug from academy.public_lessons order by slug")).rows.map((r) => r.slug) });
await c.end();
