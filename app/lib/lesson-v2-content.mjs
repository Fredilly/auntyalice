/**
 * Reference lesson for Academy V2: WAEC Mathematics — Laws of Indices.
 *
 * Authored as structured blocks so the renderer can teach rather than dump text:
 * stated objectives, worked examples revealed a step at a time, the mistakes examiners
 * actually see, then practice with an explanation on every answer.
 */
export const lawsOfIndicesBlocks = [
  {
    type: "objectives",
    items: [
      "Simplify products and quotients of powers with the same base",
      "Explain why a^0 = 1 and why a^(−n) is a fraction, not a negative number",
      "Apply a power to a power, including brackets",
      "Solve an indicial equation by writing both sides to the same base",
    ],
  },
  {
    type: "section",
    heading: "What an index means",
    paras: [
      "An index (plural indices) counts how many times a number is multiplied by itself. In $a^n$, the letter $a$ is the base and $n$ is the index: it means $a$ multiplied by itself $n$ times.",
      "So $2^4$ means $2 \\times 2 \\times 2 \\times 2$.",
    ],
    math: "2^4 = 2 \\times 2 \\times 2 \\times 2 = 16",
    note: "Every rule below follows from that one sentence. If you forget a rule, expand it.",
  },
  {
    type: "section",
    heading: "The five laws",
    paras: [
      "1. Multiplication adds indices, but only when the base is the same: $a^m \\times a^n = a^{m+n}$.",
      "2. Division subtracts indices: $a^m \\div a^n = a^{m-n}$.",
      "3. A power of a power multiplies indices: $(a^m)^n = a^{mn}$.",
      "4. Anything to the power zero is one: $a^0 = 1$ (for $a \\neq 0$).",
      "5. A negative index is a reciprocal: $a^{-n} = \\frac{1}{a^n}$.",
    ],
    note: "Laws 1 and 2 fail the moment the bases differ: $2^3 \\times 3^2$ cannot be combined.",
  },
  {
    type: "worked",
    title: "Simplify (2^5 × 2^3) ÷ 2^4",
    steps: [
      { text: "Same base throughout, so the laws apply directly." },
      { text: "Multiply by adding the indices in the numerator.", math: "2^5 \\times 2^3 = 2^{5+3} = 2^8" },
      { text: "Divide by subtracting the denominator's index.", math: "2^8 \\div 2^4 = 2^{8-4} = 2^4" },
      { text: "Evaluate.", math: "2^4 = 16" },
    ],
    answer: "The answer is $16$.",
  },
  {
    type: "worked",
    title: "Solve 3^(2x − 1) = 27",
    steps: [
      { text: "Both sides must be written to the same base. Look for a power of 3 on the right." },
      { text: "Express 27 as a power of 3.", math: "27 = 3^3" },
      { text: "Now the equation is $3^{2x-1} = 3^3$. Equal bases mean equal indices.", math: "2x - 1 = 3" },
      { text: "Solve the linear equation.", math: "2x = 4" },
    ],
    answer: "So $x = 2$.",
  },
  {
    type: "mistakes",
    items: [
      {
        wrong: "Adding indices when the bases differ: $2^3 \\times 3^2 = 6^5$",
        why: "The index law only combines powers of the same base. There is no rule that merges different bases.",
        right: "$2^3 \\times 3^2 = 8 \\times 9 = 72$ — evaluate each power separately.",
      },
      {
        wrong: "Treating a negative index as a negative answer: $2^{-3} = -8$",
        why: "A negative index means reciprocal, not sign. The minus is in the exponent, not in front of the number.",
        right: "$2^{-3} = \\frac{1}{2^3} = \\frac{1}{8}$",
      },
      {
        wrong: "Multiplying instead of adding: $a^3 \\times a^4 = a^{12}$",
        why: "Multiplying indices is the rule for a power of a power, $(a^3)^4$. A plain product adds.",
        right: "$a^3 \\times a^4 = a^{3+4} = a^7$",
      },
    ],
  },
  {
    type: "practice",
    questions: [
      {
        id: "q1",
        prompt: "Simplify $5^7 \\div 5^4$.",
        options: ["$5^3$", "$5^{11}$", "$1^3$", "$5^{28}$"],
        answer: 0,
        explanation: "Dividing powers of the same base subtracts the indices: $7 - 4 = 3$, so the answer is $5^3$.",
      },
      {
        id: "q2",
        prompt: "Evaluate $2^{-3}$.",
        options: ["$-8$", "$-6$", "$\\frac{1}{8}$", "$8$"],
        answer: 2,
        explanation: "A negative index means the reciprocal: $2^{-3} = \\frac{1}{2^3} = \\frac{1}{8}$. It is not negative.",
      },
      {
        id: "q3",
        prompt: "Solve $2^{x+1} = 32$.",
        options: ["$x = 4$", "$x = 5$", "$x = 6$", "$x = 16$"],
        answer: 0,
        explanation: "Write 32 as a power of 2: $32 = 2^5$. Equal bases give equal indices, so $x + 1 = 5$ and $x = 4$.",
      },
      {
        id: "q4",
        prompt: "Simplify $(3^4)^2$.",
        options: ["$3^6$", "$3^8$", "$9^8$", "$3^{16}$"],
        answer: 1,
        explanation: "A power of a power multiplies the indices: $4 \\times 2 = 8$, so $3^8$.",
      },
      {
        id: "q5",
        prompt: "What is $7^0$?",
        options: ["$0$", "$1$", "$7$", "undefined"],
        answer: 1,
        explanation: "Any non-zero base raised to the power zero equals 1, because $a^n \\div a^n = a^{n-n} = a^0$ and anything divided by itself is 1.",
      },
    ],
  },
];

export const lawsOfIndicesMeta = {
  title: "Laws of Indices",
  slug: "laws-of-indices",
  examTracks: ["waec"],
  objectives: lawsOfIndicesBlocks[0].items,
};
