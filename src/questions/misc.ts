import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { Country, countryCorrectMatchesFilter } from "../main.ts";
import { Question } from "./base.ts";

@customElement("x-country-what-population")
export class CountryHasWhatPopulationQuestion extends Question {
  choices: Country[];
  correct: number;

  constructor(lives: number) {
    super(lives);

    const question = countryCorrectMatchesFilter(
      (_) => true,
      (correct) => {
        const correctPopulation = correct.population;
        return (country) => {
          const countryPopulation = country.population;
          return (
            Math.abs(correctPopulation - countryPopulation) /
              correctPopulation >
            0.1
          );
        };
      },
    );

    this.choices = question.choices;
    this.correct = question.correct;
  }

  render() {
    const formatter = new Intl.NumberFormat("en", {
      notation: "compact",
      minimumSignificantDigits: 3,
      maximumSignificantDigits: 3,
      compactDisplay: "long",
    });

    return html`<div class="grid place-items-center">
      <div
        class="grid place-items-center text-wrap max-w-100 text-center gap-2"
      >
        <span>
          What is the population of
          <b>${this.choices[this.correct].name}</b>?
        </span>
      </div>
      <x-option-selection
        correct=${this.correct}
        choices=${JSON.stringify(
          this.choices
            .map((country) => country.population)
            .map(formatter.format),
        )}
      ></x-option-selection>
      <x-fatality-indicator lives=${this.lives}></x-fatality-indicator>
    </div>`;
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
