import type { Block } from "../components/lesson-experience";
import { lawsOfIndicesBlocks } from "./lesson-v2-content.mjs";
export type PreviewLesson = { slug: string; title: string; blocks: Block[] };
export const mathPreviews: PreviewLesson[] = [{slug:"laws-of-indices",title:"Laws of Indices",blocks:lawsOfIndicesBlocks as Block[]}, ...[
  {
    "slug": "percentages-and-profit",
    "title": "Percentages, Profit and Loss",
    "blocks": [
      {
        "type": "objectives",
        "items": [
          "Calculate a percentage of an amount",
          "Recover the original price",
          "Calculate profit, loss and discounts"
        ]
      },
      {
        "type": "section",
        "heading": "Understand the idea",
        "paras": [
          "A percentage is a fraction out of 100. Multiply an amount by p/100 to find p%.",
          "Profit is selling price minus cost price. Loss is cost price minus selling price. Divide either by the positive cost price and multiply by 100.",
          "A discount is measured against the marked price."
        ]
      },
      {
        "type": "worked",
        "title": "Rice: buy for ₦48,000, sell for ₦55,200",
        "steps": [
          {
            "text": "Subtract the cost from the selling price: ₦7,200."
          },
          {
            "text": "Divide 7,200 by 48,000 and multiply by 100."
          }
        ],
        "answer": "15% profit."
      },
      {
        "type": "worked",
        "title": "₦4,000 after a 20% discount",
        "steps": [
          {
            "text": "The buyer pays 80% of the original price."
          },
          {
            "text": "Divide 4,000 by 0.8."
          }
        ],
        "answer": "₦5,000 original price."
      },
      {
        "type": "mistakes",
        "items": [
          {
            "wrong": "Divide profit by selling price",
            "why": "Profit is measured relative to cost.",
            "right": "Divide by cost price."
          },
          {
            "wrong": "Add 20% to the discounted price",
            "why": "The discount was taken from the original price.",
            "right": "Divide the discounted price by 0.8."
          }
        ]
      },
      {
        "type": "practice",
        "questions": [
          {
            "id": "q1",
            "prompt": "Find 15% of ₦2,400.",
            "options": [
              "₦160",
              "₦240",
              "₦360",
              "₦3,600"
            ],
            "answer": 2,
            "explanation": "0.15 × 2,400 = 360."
          },
          {
            "id": "q2",
            "prompt": "Buy for ₦48,000, sell for ₦55,200. Percentage profit?",
            "options": [
              "13%",
              "15%",
              "20%",
              "28%"
            ],
            "answer": 1,
            "explanation": "7,200 ÷ 48,000 × 100 = 15%."
          },
          {
            "id": "q3",
            "prompt": "Score 42 out of 60. What percentage?",
            "options": [
              "42%",
              "60%",
              "70%",
              "72%"
            ],
            "answer": 2,
            "explanation": "42 ÷ 60 × 100 = 70%."
          },
          {
            "id": "q4",
            "prompt": "₦5,000 item discounted by 20%. New price?",
            "options": [
              "₦1,000",
              "₦4,000",
              "₦4,800",
              "₦6,000"
            ],
            "answer": 1,
            "explanation": "5,000 × 0.8 = 4,000."
          },
          {
            "id": "q5",
            "prompt": "What is the reference amount for percentage profit?",
            "options": [
              "Selling price",
              "Marked price",
              "Cost price",
              "Average price"
            ],
            "answer": 2,
            "explanation": "Profit is measured relative to cost."
          }
        ]
      }
    ]
  },
  {
    "slug": "simultaneous-equations",
    "title": "Simultaneous Equations",
    "blocks": [
      {
        "type": "objectives",
        "items": [
          "Solve by elimination and substitution",
          "Check both equations",
          "Form equations from a word problem"
        ]
      },
      {
        "type": "section",
        "heading": "Understand the idea",
        "paras": [
          "A simultaneous solution satisfies both equations at once.",
          "Elimination removes one unknown by adding or subtracting equations after matching coefficients. Substitution replaces an unknown with an equivalent expression."
        ]
      },
      {
        "type": "worked",
        "title": "Solve x + y = 5 and x − y = 1",
        "steps": [
          {
            "text": "Add the equations: 2x = 6."
          },
          {
            "text": "x = 3. Substitute into 3 + y = 5."
          },
          {
            "text": "y = 2. Check: 3 − 2 = 1."
          }
        ],
        "answer": "x = 3, y = 2."
      },
      {
        "type": "worked",
        "title": "Solve y = 2x + 1 and x + y = 10",
        "steps": [
          {
            "text": "Substitute: x + 2x + 1 = 10."
          },
          {
            "text": "3x = 9, so x = 3."
          },
          {
            "text": "y = 2(3) + 1 = 7. Check: 3 + 7 = 10."
          }
        ],
        "answer": "x = 3, y = 7."
      },
      {
        "type": "mistakes",
        "items": [
          {
            "wrong": "Multiply only one term",
            "why": "An equation must remain balanced.",
            "right": "Multiply every term on both sides."
          },
          {
            "wrong": "Check only one equation",
            "why": "A solution must satisfy both.",
            "right": "Substitute into both equations."
          }
        ]
      },
      {
        "type": "practice",
        "questions": [
          {
            "id": "q1",
            "prompt": "Solve x+y=5, x−y=1. Find (x,y).",
            "options": [
              "(3,2)",
              "(2,3)",
              "(4,1)",
              "(5,0)"
            ],
            "answer": 0,
            "explanation": "Add: 2x=6, so x=3 and y=2."
          },
          {
            "id": "q2",
            "prompt": "y=x+2, x+y=8. Find (x,y).",
            "options": [
              "(5,3)",
              "(3,5)",
              "(4,4)",
              "(2,6)"
            ],
            "answer": 1,
            "explanation": "2x+2=8; x=3, y=5."
          },
          {
            "id": "q3",
            "prompt": "2x+y=11, x+y=7. Find (x,y).",
            "options": [
              "(3,4)",
              "(5,2)",
              "(4,3)",
              "(2,5)"
            ],
            "answer": 2,
            "explanation": "Subtract: x=4, y=3."
          },
          {
            "id": "q4",
            "prompt": "Which pair satisfies 3x+y=10 and x−y=2?",
            "options": [
              "(2,4)",
              "(4,2)",
              "(1,7)",
              "(3,1)"
            ],
            "answer": 3,
            "explanation": "9+1=10 and 3−1=2."
          },
          {
            "id": "q5",
            "prompt": "Two pens and a notebook cost ₦900; one pen and a notebook cost ₦650. Price of a pen?",
            "options": [
              "₦250",
              "₦400",
              "₦450",
              "₦650"
            ],
            "answer": 0,
            "explanation": "Subtract the totals: 900−650=250."
          }
        ]
      }
    ]
  }
] as PreviewLesson[]];
