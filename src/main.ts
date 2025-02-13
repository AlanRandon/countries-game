import data from "../data/countries.json";
import { LitElement, TemplateResult, html } from "lit";
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

    this.addEventListener("skip-question", this.replaceQuestion);
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

const QUESTION_HAS_WHICH_CAPITAL = 0 as const;
const QUESTION_CAPITAL_IN_WHICH_COUNTRY = 1 as const;
const QUESTION_FLAG_FOR_WHICH_COUNTRY = 2 as const;

const MAX_QUESTION_KIND = QUESTION_FLAG_FOR_WHICH_COUNTRY;

type QuestionKind =
  | typeof QUESTION_HAS_WHICH_CAPITAL
  | typeof QUESTION_CAPITAL_IN_WHICH_COUNTRY
  | typeof QUESTION_FLAG_FOR_WHICH_COUNTRY;

type Country = (typeof data.countries)[0];

type CountryFilter = (country: Country) => boolean;
type CountryComparibleFilter = (country: Country) => CountryFilter;

const hasCapital: CountryFilter = (country) => country.capitals.length > 0;
const hasFlag: CountryFilter = (country) => typeof country.flag !== "undefined";
const isCountryFlagComparible: CountryComparibleFilter = (countryA) => {
  const repeats = new Set(countryA.flagRepeats);
  return (countryB) => !repeats.has(countryB.code);
};

const requirementSets = {
  capitals: new Set(data.countries.filter(hasCapital)),
  flags: new Set(data.countries.filter(hasFlag)),
} as const;

function shuffle<T>(arr: Array<T>): Array<T> {
  return arr
    .map((value) => ({ value, sort: Math.random() }))
    .toSorted((a, b) => a.sort - b.sort)
    .map((value) => value.value);
}

function countryCorrectMatchesFilter(
  filter: CountryFilter,
  comparibleFilter: CountryComparibleFilter,
): {
  correct: number;
  choices: Country[];
} {
  const choices = shuffle(
    data.countries.map((country, originalIndex) => ({
      country,
      originalIndex,
    })),
  );

  const start = choices.findIndex((choice) => filter(choice.country));

  const comparibleFilterInstance = comparibleFilter(choices[start].country);

  const shuffledChoices = shuffle(
    choices
      .slice(start, -1)
      .filter((choice) => comparibleFilterInstance(choice.country))
      .slice(0, OPTION_COUNT)
      .map((choice, index) => ({
        choice,
        correct: index == 0,
      })),
  );

  return {
    correct: shuffledChoices.findIndex((choice) => choice.correct),
    choices: shuffledChoices.map((choice) => choice.choice.country),
  };
}

@customElement("x-question")
export class Question extends LitElementNoShadow {
  choices: Country[];
  correct: number;
  kind: QuestionKind;

  constructor() {
    super();
    this.style.display = "contents";

    const kind = Math.floor(
      Math.random() * (MAX_QUESTION_KIND + 1),
    ) as QuestionKind;

    switch (kind) {
      case QUESTION_HAS_WHICH_CAPITAL: {
        this.choices = shuffle(Array.from(requirementSets.capitals)).slice(
          0,
          OPTION_COUNT,
        );
        this.correct = Math.floor(Math.random() * OPTION_COUNT);
        break;
      }
      case QUESTION_CAPITAL_IN_WHICH_COUNTRY: {
        const question = countryCorrectMatchesFilter(
          hasCapital,
          (_) => (_) => true,
        );
        this.choices = question.choices;
        this.correct = question.correct;
        break;
      }
      case QUESTION_FLAG_FOR_WHICH_COUNTRY: {
        const question = countryCorrectMatchesFilter(
          hasFlag,
          isCountryFlagComparible,
        );
        this.choices = question.choices;
        this.correct = question.correct;
        break;
      }
    }

    this.kind = kind;
  }

  getChoiceText(country: Country): string {
    switch (this.kind) {
      case QUESTION_HAS_WHICH_CAPITAL:
        return country.capitals[
          Math.floor(Math.random() * country.capitals.length)
        ];
      case QUESTION_CAPITAL_IN_WHICH_COUNTRY:
        return country.name;
      case QUESTION_FLAG_FOR_WHICH_COUNTRY:
        return country.name;
    }
  }

  getQuestionText(): TemplateResult {
    const country = this.choices[this.correct];
    switch (this.kind) {
      case QUESTION_HAS_WHICH_CAPITAL:
        return html`<span
          >Which is a capital of <b .innerHTML=${country.name}></b>?</span
        >`;
      case QUESTION_CAPITAL_IN_WHICH_COUNTRY:
        return html`<span
          ><b
            .innerHTML=${country.capitals[
              Math.floor(Math.random() * country.capitals.length)
            ]}
          ></b>
          is a capital of which country?</span
        >`;
      case QUESTION_FLAG_FOR_WHICH_COUNTRY:
        const src =
          document.location.hostname == "alanrandon.github.io"
            ? `https://alanrandon.github.io/countries-game${country.flag}`
            : country.flag;

        return html`<span>Which country has the following flag?</span
          ><img src="${src}" class="h-8" />`;
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
        ${ref(button)}
        .innerHTML=${this.getChoiceText(country)}
      ></button>`;
    });

    return html`<div class="grid place-items-center">
      <div class="grid place-items-center">${this.getQuestionText()}</div>
      <div class="flex flex-col items-center justify-center gap-2 m-2 min-w-64">
        ${choices}
      </div>
    </div>`;

    // <button
    //   class="border-2 border-slate-400 text-slate-400 rounded-full px-4 w-full transition-colors hover:bg-slate-400 hover:text-slate-900"
    //   @click=${() =>
    //     this.dispatchEvent(
    //       new CustomEvent("skip-question", { bubbles: true }),
    //     )}
    // >
    //   Skip
    // </button>
  }
}
