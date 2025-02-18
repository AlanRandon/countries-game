import data from "../data/countries.json";
import { LitElement, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";

class LitElementNoShadow extends LitElement {
  createRenderRoot() {
    return this;
  }
}

const MAX_LIVES = 3;

@customElement("x-quiz")
export class Quiz extends LitElementNoShadow {
  @query("x-question")
  question!: Question;

  @state()
  score: number = 0;

  @state()
  highScore: number = +(localStorage.getItem("country-game:high-score") || 0);

  @state()
  lives: number = MAX_LIVES;

  replaceQuestion() {
    this.question.replaceWith(new Question());
  }

  constructor() {
    super();

    this.addEventListener("answer-correct", () => {
      this.highScore = Math.max(this.highScore, ++this.score);
      this.lives = Math.min(this.lives + 1, MAX_LIVES);

      localStorage.setItem(
        "country-game:high-score",
        this.highScore.toString(),
      );

      this.replaceQuestion();
    });

    this.addEventListener("answer-incorrect", () => {
      this.lives--;
      if (this.lives == 0) {
        this.score = 0;
        this.lives = MAX_LIVES;
      }

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
        <div class="bg-slate-900 p-2 px-4 rounded-full">
          Lives: <b>${this.lives}</b>
        </div>
      </div>
      <div class="grid place-items-center gap-2 h-full">
        <x-question></x-question>
      </div>
    </div>`;
  }
}

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
      .slice(start)
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

const OPTION_COUNT = 6;

@customElement("x-option-selection")
export class OptionSelection extends LitElementNoShadow {
  @property({ type: Array<String> })
  choices!: string[];
  @property()
  question!: string;
  @property()
  correct!: number;

  render() {
    const correctButton = createRef<HTMLButtonElement>();
    const choices = this.choices.map((choice, i) => {
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
        .innerHTML=${choice}
      ></button>`;
    });

    return html`<div class="grid place-items-center">
      <div
        class="grid place-items-center text-wrap max-w-100 text-center"
        .innerHTML=${this.question}
      ></div>
      <div class="flex flex-col items-center justify-center gap-2 m-2 min-w-64">
        ${choices}
      </div>
    </div>`;
  }
}

@customElement("x-country-which-capital")
export class CountryHasWhichCapitalQuestion extends LitElementNoShadow {
  choices: Country[];
  correct: number;

  constructor() {
    super();

    this.choices = shuffle(Array.from(requirementSets.capitals)).slice(
      0,
      OPTION_COUNT,
    );
    this.correct = Math.floor(Math.random() * OPTION_COUNT);
  }

  render() {
    return html`<x-option-selection
      question=${`<span>Which is a capital of <b>${this.choices[this.correct].name}</b>?</span>`}
      correct=${this.correct}
      choices=${JSON.stringify(
        this.choices.map(
          (country) =>
            country.capitals[
              Math.floor(Math.random() * country.capitals.length)
            ],
        ),
      )}
    ></x-option-selection>`;
  }
}

@customElement("x-capital-which-country")
export class CaptialInWhichCountryQuestion extends LitElementNoShadow {
  choices: Country[];
  correct: number;
  capital: string;

  constructor() {
    super();

    const question = countryCorrectMatchesFilter(
      hasCapital,
      (_) => (_) => true,
    );

    this.choices = question.choices;
    this.correct = question.correct;
    this.capital =
      this.choices[this.correct].capitals[
        Math.floor(Math.random() * this.choices[this.correct].capitals.length)
      ];
  }
  render() {
    return html`<x-option-selection
      question=${`<span><b>${this.capital}</b> is a capital of which country/territory?</span>`}
      correct=${this.correct}
      choices=${JSON.stringify(this.choices.map((country) => country.name))}
    ></x-option-selection>`;
  }
}

@customElement("x-region-which-country")
export class RegionInWhichCountryQuestion extends LitElementNoShadow {
  choices: Country[];
  correct: number;
  division: string;

  constructor() {
    super();

    let division: string;
    const question = countryCorrectMatchesFilter(
      (country) => country.divisions.length > 0,
      (correct) => {
        division =
          correct.divisions[
            Math.floor(Math.random() * correct.divisions.length)
          ];

        return (country) => {
          if (country.code == correct.code) {
            return true;
          }

          const divisions: string[] = country.divisions;
          return !divisions.includes(division!);
        };
      },
    );

    this.choices = question.choices;
    this.correct = question.correct;
    this.division = division!;
  }

  render() {
    return html`<x-option-selection
      question=${`<span><b>${this.division}</b> is an administrative division of which country/territory?</span>`}
      correct=${this.correct}
      choices=${JSON.stringify(this.choices.map((country) => country.name))}
    ></x-option-selection>`;
  }
}

@customElement("x-flag-which-country")
export class FlagOfWhichCountryQuestion extends LitElementNoShadow {
  choices: Country[];
  correct: number;

  constructor() {
    super();

    const question = countryCorrectMatchesFilter(
      hasFlag,
      isCountryFlagComparible,
    );
    this.choices = question.choices;
    this.correct = question.correct;
  }

  render() {
    const country = this.choices[this.correct];
    const src =
      document.location.hostname == "alanrandon.github.io"
        ? `https://alanrandon.github.io/countries-game${country.flag}`
        : country.flag;

    return html`<x-option-selection
      question=${`<span>Which country has the following flag?</span><img src="${src}" class="h-8" />`}
      correct=${this.correct}
      choices=${JSON.stringify(this.choices.map((country) => country.name))}
    ></x-option-selection>`;
  }
}

@customElement("x-question")
export class Question extends LitElementNoShadow {
  question: LitElementNoShadow;

  constructor() {
    super();
    this.question = new questionKinds[
      Math.floor(Math.random() * questionKinds.length)
    ]();
  }

  render() {
    return html`${this.question}`;
  }
}

const questionKinds = [
  CountryHasWhichCapitalQuestion,
  CaptialInWhichCountryQuestion,
  FlagOfWhichCountryQuestion,
  RegionInWhichCountryQuestion,
];
