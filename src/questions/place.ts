import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { Question } from "./base.ts";
import {
  Country,
  shuffle,
  countryCorrectMatchesFilter,
  countriesWithCapitals,
} from "../main.ts";
import { OPTION_COUNT } from "../quiz.ts";

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
