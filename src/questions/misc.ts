import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { Country, countryCorrectMatchesFilter, shuffle } from "../main.ts";
import data from "../../data/countries.json";
import { Question } from "./base.ts";

const POPULATION_GREATER = 0 as const;
const POPULATION_SMALLER = 1 as const;
const POPULATION_WHICH_COUNTRY = 2 as const;

type PopulationComparison =
  | typeof POPULATION_GREATER
  | typeof POPULATION_SMALLER
  | typeof POPULATION_WHICH_COUNTRY;

const numberFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  minimumSignificantDigits: 3,
  maximumSignificantDigits: 3,
  compactDisplay: "long",
});

@customElement("x-country-population-comparison")
export class CountryPopulationComparison extends Question {
  first: Country;
  second: Country;
  comparison: PopulationComparison;

  constructor(lives: number) {
    super(lives);

    let choices = shuffle(data.countries);

    this.first = choices[0];
    this.second = choices.find(
      (country) =>
        Math.abs(
          Math.log10(country.population) - Math.log10(this.first.population),
        ) > 0.1,
    ) as Country;

    this.comparison = shuffle([
      POPULATION_GREATER,
      POPULATION_SMALLER,
      POPULATION_WHICH_COUNTRY,
      POPULATION_WHICH_COUNTRY,
      POPULATION_WHICH_COUNTRY,
    ])[0];
  }

  render() {
    switch (this.comparison) {
      case POPULATION_GREATER: {
        const correct = this.first.population > this.second.population ? 0 : 1;
        return html`<div class="grid place-items-center">
          <div
            class="grid place-items-center text-wrap max-w-100 text-center gap-2"
          >
            <span>Which country has the greater population?</span>
          </div>
          <x-option-selection
            correct=${correct}
            choices=${JSON.stringify([this.first.name, this.second.name])}
          ></x-option-selection>
          <x-fatality-indicator lives=${this.lives}></x-fatality-indicator>
        </div>`;
      }
      case POPULATION_SMALLER: {
        const correct = this.first.population < this.second.population ? 0 : 1;
        return html`<div class="grid place-items-center">
          <div
            class="grid place-items-center text-wrap max-w-100 text-center gap-2"
          >
            <span>Which country has the smaller population?</span>
          </div>
          <x-option-selection
            correct=${correct}
            choices=${JSON.stringify([this.first.name, this.second.name])}
          ></x-option-selection>
          <x-fatality-indicator lives=${this.lives}></x-fatality-indicator>
        </div>`;
      }
      case POPULATION_WHICH_COUNTRY: {
        const first = Math.random() > 0.5;
        return html`<div class="grid place-items-center">
          <div
            class="grid place-items-center text-wrap max-w-100 text-center gap-2"
          >
            <span
              >Which country has a population of
              ${numberFormatter.format(
                first ? this.first.population : this.second.population,
              )}?</span
            >
          </div>
          <x-option-selection
            correct=${first ? 0 : 1}
            choices=${JSON.stringify([this.first.name, this.second.name])}
          ></x-option-selection>
          <x-fatality-indicator lives=${this.lives}></x-fatality-indicator>
        </div>`;
      }
    }
  }
}

@customElement("x-country-which-borders-countries")
export class CountryWhichBordersQuestion extends Question {
  choices: Country[];
  correct: number;
  borderCountry: string;

  constructor(lives: number) {
    super(lives);

    let borderCountry!: string;
    const question = countryCorrectMatchesFilter(
      (country) => country.borderCountries.length > 0,
      (correct) => {
        borderCountry =
          correct.borderCountries[
            Math.floor(Math.random() * correct.borderCountries.length)
          ];

        return (country) => {
          if (country.id == correct.id) {
            return true;
          }

          return !(country.borderCountries as string[]).includes(
            borderCountry!,
          );
        };
      },
    );

    this.borderCountry = borderCountry;
    this.choices = question.choices;
    this.correct = question.correct;
  }

  render() {
    return html`<div class="grid place-items-center">
      <div
        class="grid place-items-center text-wrap max-w-100 text-center gap-2"
      >
        <span>
          Which country borders
          <b>${this.borderCountry}</b>?
        </span>
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

@customElement("x-country-which-head-of-gov")
export class CountryWhichHeadOfGovernment extends Question {
  choices: Country[];
  correct: number;
  name: string;

  constructor(lives: number) {
    super(lives);

    const question = countryCorrectMatchesFilter(
      (country) => country.headsOfGovernment.length > 0,
      (_countryA) => (_countryB) => true,
    );

    this.choices = question.choices;
    this.correct = question.correct;

    const headsOfGovernment =
      question.choices[question.correct].headsOfGovernment;

    this.name =
      headsOfGovernment[Math.floor(Math.random() * headsOfGovernment.length)];
  }

  render() {
    return html`<div class="grid place-items-center">
      <div
        class="grid place-items-center text-wrap max-w-100 text-center gap-2"
      >
        <span>
          Which country's government is led by
          <b>${this.name}</b>?
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
