import { html } from "lit";
import { customElement, query } from "lit/decorators.js";
import { Question } from "./base.ts";
import {
  Country,
  shuffle,
  countryCorrectMatchesFilter,
  countriesWithCapitals,
} from "../main.ts";
import { OPTION_COUNT } from "../quiz.ts";
import data from "../../data/countries.json";
import { createRef, Ref, ref } from "lit/directives/ref.js";

@customElement("x-country-which-capital")
export class CountryHasWhichCapitalQuestion extends Question {
  choices: Country[];
  correct: number;

  constructor(lives: number) {
    super(lives);

    this.choices = shuffle(Array.from(countriesWithCapitals)).slice(
      0,
      OPTION_COUNT,
    );
    this.correct = Math.floor(Math.random() * OPTION_COUNT);
  }

  render() {
    return html`<div class="grid place-items-center">
      <div
        class="grid place-items-center text-wrap max-w-100 text-center gap-2"
      >
        <span>
          Which is a capital of
          <b>${this.choices[this.correct].name}</b>?
        </span>
      </div>
      <x-option-selection
        correct=${this.correct}
        choices=${JSON.stringify(
          this.choices.map(
            (country) =>
              country.capitals[
                Math.floor(Math.random() * country.capitals.length)
              ],
          ),
        )}
        fatal
      ></x-option-selection>
      <x-fatality-indicator lives="0"></x-fatality-indicator>
    </div>`;
  }
}

@customElement("x-capital-which-country")
export class CaptialInWhichCountryQuestion extends Question {
  choices: Country[];
  correct: number;
  capital: string;

  constructor(lives: number) {
    super(lives);

    const question = countryCorrectMatchesFilter(
      (country) => country.capitals.length > 0,
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
    return html`<div class="grid place-items-center">
      <div
        class="grid place-items-center text-wrap max-w-100 text-center gap-2"
      >
        <span> <b>${this.capital}</b> is a capital of which country? </span>
      </div>
      <x-option-selection
        correct=${this.correct}
        choices=${JSON.stringify(this.choices.map((country) => country.name))}
        fatal
      ></x-option-selection>
      <x-fatality-indicator lives="0"></x-fatality-indicator>
    </div>`;
  }
}

@customElement("x-region-which-country")
export class RegionInWhichCountryQuestion extends Question {
  choices: Country[];
  correct: number;
  division: string;

  constructor(lives: number) {
    super(lives);

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
    return html`<div class="grid place-items-center">
      <div
        class="grid place-items-center text-wrap max-w-100 text-center gap-2"
      >
        <span>
          <b>${this.division}</b> is an administrative division of which
          country?
        </span>
      </div>
      <x-option-selection
        correct=${this.correct}
        choices=${JSON.stringify(this.choices.map((country) => country.name))}
      ></x-option-selection>
      <x-fatality-indicator lives=${this.lives}></x-fatality-indicator>
    </div>`;
  }
}

const continents = new Set(
  data.countries.flatMap((country: Country) => country.continents),
);

@customElement("x-continent-name-country")
export class ContinentNameCountry extends Question {
  continent: string;

  @query("input")
  input!: HTMLInputElement;

  constructor(lives: number) {
    super(lives);

    const continentsArray = Array.from(continents);
    this.continent =
      continentsArray[Math.floor(Math.random() * continentsArray.length)];
  }

  firstUpdated() {
    this.input.focus();
  }

  render() {
    return html`<div class="grid place-items-center gap-2">
      <div class="grid place-items-center text-wrap max-w-100 text-center">
        <span>Name a country in ${this.continent}</span>
      </div>
      <input
        type="text"
        class="border-2 border-slate-300 rounded-[1em] px-4 transition-colors hover:bg-slate-300 hover:text-slate-900 focus-within:bg-slate-300 focus-within:text-slate-900"
        @input=${() => {
          if (
            data.countries.findIndex(
              (country) =>
                country.continents.indexOf(this.continent) !== -1 &&
                countryNameMatches(country, this.input.value),
            ) !== -1
          ) {
            this.dispatchEvent(
              new CustomEvent("answer-correct", {
                bubbles: true,
                detail: { fatal: true },
              }),
            );
          }
        }}
      />
    </div>`;
  }
}

function countryNameMatches(country: Country, name: string): boolean {
  switch (name.toLowerCase()) {
    case "drc":
      return country.name.toLowerCase() == "drc";
    case "uae":
      return country.name.toLowerCase() == "united arab emirates";
    case "us":
    case "usa":
      return country.name.toLowerCase() == "united states";
    case "uk":
      return country.name.toLowerCase() == "united kingdom";
    case "prc":
    case "china":
      return country.name.toLowerCase() == "people's republic of china";
    case "dprk":
      return country.name.toLowerCase() == "north korea";
    case "nz":
      return country.name.toLowerCase() == "new zealand";
    case "czechia":
      return country.name.toLowerCase() == "czech republic";
    case "dr":
      return country.name.toLowerCase() == "dominican republic";
    case "micronesia":
      return country.name.toLowerCase() == "federated states of micronesia";
    case "netherlands":
      return country.name.toLowerCase() == "kingdom of the netherlands";
    case "abkhazia":
      return country.name.toLowerCase() == "republic of abkhazia";
    case "saudi":
      return country.name.toLowerCase() == "saudi arabia";
    case "palestine":
      return country.name.toLowerCase() == "state of palestine";
    case "roc":
      return country.name.toLowerCase() == "taiwan";
    default:
      return country.name.toLowerCase() === name.toLowerCase();
  }
}

@customElement("x-country-which-continent")
export class CountryInWhichContinent extends Question {
  country: Country;

  constructor(lives: number) {
    super(lives);

    this.country =
      data.countries[Math.floor(Math.random() * data.countries.length)];
  }

  render() {
    var correctButtons: Ref<HTMLButtonElement>[] = [];
    const choices = Array.from(continents).map((continent) => {
      const { event, classes, timeout, button } =
        this.country.continents.indexOf(continent) !== -1
          ? {
              event: "answer-correct",
              classes: ["wiggle", "text-slate-900"],
              button: (() => {
                const button = createRef<HTMLButtonElement>();
                correctButtons.push(button);
                return button;
              })(),
              timeout: 500,
            }
          : {
              event: "answer-incorrect",
              classes: ["bg-red-600!", "border-red-600!", "text-slate-900!"],
              button: createRef<HTMLButtonElement>(),
              timeout: 1500,
            };

      return html`<button
        class="border-2 border-slate-300 rounded-[1em] px-4 w-full transition-colors hover:bg-slate-300 hover:text-slate-900"
        @click=${() => {
          for (const correctButton of correctButtons) {
            correctButton.value!.classList.add(
              "bg-green-600!",
              "border-green-600!",
            );
          }

          button.value!.classList.add(...classes);
          setTimeout(
            () =>
              this.dispatchEvent(
                new CustomEvent(event, {
                  bubbles: true,
                  detail: { fatal: true },
                }),
              ),
            timeout,
          );
        }}
        ${ref(button)}
      >
        ${continent}
      </button>`;
    });

    return html`<div class="grid place-items-center">
      <div class="grid place-items-center text-wrap max-w-100 text-center">
        <span>
          Which continent is
          <b>${this.country.name}</b> in?
        </span>
        <span class="text-center p-2 text-slate-500"
          ><b>note:</b> multiple may be correct</span
        >
      </div>
      <div class="flex flex-col items-center justify-center gap-2 m-2 min-w-64">
        ${choices}
      </div>
      <x-fatality-indicator lives="0"></x-fatality-indicator>
    </div>`;
  }
}
