import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { Country, countryCorrectMatchesFilter } from "../main.ts";
import { Question } from "./base.ts";

@customElement("x-country-which-flag")
export class CountryWhichFlagQuestion extends Question {
  choices: Country[];
  correct: number;

  constructor(lives: number) {
    super(lives);

    const question = countryCorrectMatchesFilter(
      (country) => typeof country.flagImage.localUri === "string",
      (countryA) => {
        return (countryB) =>
          !(countryA.code === "TD" && countryB.code === "RO") &&
          !(countryB.code === "TD" && countryA.code === "RO");
      },
    );

    this.choices = question.choices;
    this.correct = question.correct;
  }

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

      const src =
        import.meta.env.BASE_URL.replace(/\/$/, "") + choice.flagImage.localUri;

      return html`<button
        class="border-2 border-slate-300 rounded grid place-items-center p-4 w-full transition-colors hover:bg-slate-300 hover:text-slate-900"
        @click=${() => {
          correctButton.value!.classList.add(
            "bg-green-600!",
            "border-green-600!",
          );

          button.value!.classList.add(...classes);
          setTimeout(
            () =>
              this.dispatchEvent(
                new CustomEvent(event, {
                  bubbles: true,
                  detail: { fatal: true },
                }),
              ),
            500,
          );
        }}
        ${ref(button)}
      >
        <img src=${src} class="h-8" @error=${() => this.dispatchSkip()} />
      </button>`;
    });

    return html`<div class="grid place-items-center">
      <div
        class="grid place-items-center text-wrap max-w-100 text-center gap-2"
      >
        <span
          >Which is the flag of <b>${this.choices[this.correct].name}</b>?</span
        >
      </div>
      <div class="grid place-items-center grid-cols-2 gap-2 m-2 min-w-64">
        ${choices}
      </div>
      <x-fatality-indicator lives="0"></x-fatality-indicator>
    </div>`;
  }
}

@customElement("x-flag-which-country")
export class FlagOfWhichCountryQuestion extends Question {
  choices: Country[];
  correct: number;

  constructor(lives: number) {
    super(lives);

    const question = countryCorrectMatchesFilter(
      (country) => typeof country.flagImage.localUri === "string",
      (countryA) => {
        return (countryB) =>
          !(countryA.code === "TD" && countryB.code === "RO") &&
          !(countryB.code === "TD" && countryA.code === "RO");
      },
    );
    this.choices = question.choices;
    this.correct = question.correct;
  }

  render() {
    const country = this.choices[this.correct];
    const src =
      import.meta.env.BASE_URL.replace(/\/$/, "") + country.flagImage.localUri;

    return html`<div class="grid place-items-center">
      <div
        class="grid place-items-center text-wrap max-w-100 text-center gap-2"
      >
        <span>Which country has the following flag?</span>
        <img src=${src} class="h-8" @error=${() => this.dispatchSkip()} />
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
