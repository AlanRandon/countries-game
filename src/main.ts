import data from "../data/countries.json";
import { LitElement, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";

class LitElementNoShadow extends LitElement {
  createRenderRoot() {
    return this;
  }
}

@customElement("x-quiz")
export class Quiz extends LitElementNoShadow {
  @query("x-question")
  question!: Question;

  @state()
  score: number;

  @state()
  highScore: number;

  replaceQuestion() {
    this.question.replaceWith(new Question());
  }

  constructor() {
    super();
    this.score = 0;
    this.highScore = +(localStorage.getItem("country-game:high-score") || 0);

    this.addEventListener("answer-correct", () => {
      this.highScore = Math.max(this.highScore, ++this.score);

      localStorage.setItem(
        "country-game:high-score",
        this.highScore.toString(),
      );

      this.replaceQuestion();
    });

    this.addEventListener("answer-incorrect", () => {
      this.score = 0;
      this.replaceQuestion();
    });
  }

  render() {
    return html`<div class="text-slate-300 flex flex-col h-full">
      <div class="flex flex-row gap-4 p-4">
        <div class="bg-slate-900 p-2 px-4 rounded-full">
          High Score: <b>${this.highScore}</b>
        </div>
        <div class="bg-slate-900 p-2 px-4 rounded-full">
          Score: <b>${this.score}</b>
        </div>
      </div>
      <div class="grid place-items-center gap-2 h-full">
        <x-question></x-question>
      </div>
    </div>`;
  }
}

const OPTION_COUNT = 6;

const QUESTION_WHICH_CITY = 0 as const;
const QUESTION_WHICH_COUNTRY = 1 as const;

type Country = (typeof data.countries)[0];

const withCapitals = new Set(data.withCapitals);

function shuffle<T>(arr: Array<T>): Array<T> {
  return arr
    .map((value) => ({ value, sort: Math.random() }))
    .toSorted((a, b) => a.sort - b.sort)
    .map((value) => value.value);
}

@customElement("x-question")
export class Question extends LitElementNoShadow {
  choices: Country[];
  correct: number;
  kind: typeof QUESTION_WHICH_CITY | typeof QUESTION_WHICH_COUNTRY;

  constructor() {
    super();
    this.style.display = "contents";

    const kind =
      Math.random() > 0.5 ? QUESTION_WHICH_CITY : QUESTION_WHICH_COUNTRY;

    switch (kind) {
      case QUESTION_WHICH_CITY:
        this.choices = shuffle(
          Array.from(withCapitals).map((i) => data.countries[i]),
        ).slice(0, OPTION_COUNT);

        this.correct = Math.floor(Math.random() * OPTION_COUNT);

        break;
      case QUESTION_WHICH_COUNTRY:
        let choices = shuffle(
          data.countries.map((country, originalIndex) => ({
            country,
            originalIndex,
          })),
        );

        const start = choices.findIndex((choice) =>
          withCapitals.has(choice.originalIndex),
        );

        let shuffledChoices = shuffle(
          choices.slice(start, start + OPTION_COUNT).map((choice, index) => ({
            choice,
            correct: index == 0,
          })),
        );

        this.correct = shuffledChoices.findIndex((choice) => choice.correct);
        this.choices = shuffledChoices.map((choice) => choice.choice.country);

        break;
    }

    this.kind = kind;
  }

  getChoiceText(country: Country): string {
    switch (this.kind) {
      case QUESTION_WHICH_CITY:
        return country.capitals[
          Math.floor(Math.random() * country.capitals.length)
        ];
      case QUESTION_WHICH_COUNTRY:
        return country.name;
    }
  }

  getQuestionText(): string {
    const country = this.choices[this.correct];
    switch (this.kind) {
      case QUESTION_WHICH_CITY:
        return `Which is a capital of <b>${country.name}</b>?`;
      case QUESTION_WHICH_COUNTRY:
        return `<b>${
          country.capitals[Math.floor(Math.random() * country.capitals.length)]
        }</b> is a capital of which country?`;
    }
  }

  render() {
    const correctButton = createRef<HTMLButtonElement>();
    const choices = this.choices.map((country, i) => {
      const { event, classes, button } =
        i == this.correct
          ? {
              event: "answer-correct",
              classes: ["wiggle", "text-slate-900"],
              button: correctButton,
            }
          : {
              event: "answer-incorrect",
              classes: ["bg-red-600!", "border-red-600!", "text-slate-900!"],
              button: createRef<HTMLButtonElement>(),
            };

      return html`<button
        class="border-2 border-slate-300 rounded-full px-4 w-full transition-colors hover:bg-slate-300 hover:text-slate-900"
        @click=${() => {
          correctButton.value!.classList.add(
            "bg-green-600!",
            "border-green-600!",
          );

          button.value!.classList.add(...classes);
          setTimeout(
            () => this.dispatchEvent(new CustomEvent(event, { bubbles: true })),
            500,
          );
        }}
        .innerHTML=${this.getChoiceText(country)}
        ${ref(button)}
      ></button>`;
    });

    return html`<div class="grid place-items-center">
      <div .innerHTML=${this.getQuestionText()}></div>
      <div class="flex flex-col items-center justify-center gap-2 m-2 min-w-64">
        ${choices}
      </div>
    </div>`;
  }
}
