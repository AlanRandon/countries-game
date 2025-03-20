import { html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { LitElementNoShadow, Question } from "./questions/base.ts";
import { MapIsWhichCountryQuestion } from "./questions/map.ts";
import {
  CaptialInWhichCountryQuestion,
  CountryHasWhichCapitalQuestion,
  RegionInWhichCountryQuestion,
} from "./questions/place.ts";
import {
  CountryWhichFlagQuestion,
  FlagOfWhichCountryQuestion,
} from "./questions/flag.ts";
import {
  CountryHasWhatPopulationQuestion,
  CountryWhichBordersQuestion,
  CountryWhichHeadOfGovernment,
} from "./questions/misc.ts";

export const MAX_LIVES = 3;
export const OPTION_COUNT = 6;

@customElement("x-quiz")
export class Quiz extends LitElementNoShadow {
  @query("x-question")
  question!: RandomQuestion;

  @state()
  score: number = 0;

  @state()
  highScore: number = +(localStorage.getItem("country-game:high-score") || 0);

  @state()
  lives: number = MAX_LIVES;

  replaceQuestion() {
    this.question.outerHTML = `<x-question lives=${this.lives}></x-question>`;
  }

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener(
      "answer-correct",
      (event: CustomEventInit<{ fatal: boolean }>) => {
        this.highScore = Math.max(this.highScore, ++this.score);
        if (event.detail!.fatal) {
          this.lives = Math.min(this.lives + 1, MAX_LIVES);
        }

        localStorage.setItem(
          "country-game:high-score",
          this.highScore.toString(),
        );

        this.replaceQuestion();
      },
    );

    this.addEventListener(
      "answer-incorrect",
      (event: CustomEventInit<{ fatal: boolean }>) => {
        this.lives--;
        if (event.detail!.fatal || this.lives <= 0) {
          this.score = 0;
          this.lives = MAX_LIVES;
        }

        this.replaceQuestion();
      },
    );

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
      <div class="flex flex-col align-center justify-center gap-2 h-full p-2">
        <x-question lives=${this.lives}></x-question>
      </div>
    </div>`;
  }
}

type QuestionConstructor = new (lives: number) => Question;
const questionKinds: QuestionConstructor[] = [
  MapIsWhichCountryQuestion,
  CountryWhichFlagQuestion,
  FlagOfWhichCountryQuestion,
  CountryHasWhichCapitalQuestion,
  CaptialInWhichCountryQuestion,
  RegionInWhichCountryQuestion,
  CountryHasWhatPopulationQuestion,
  CountryWhichBordersQuestion,
  CountryWhichHeadOfGovernment,
];

@customElement("x-question")
class RandomQuestion extends LitElementNoShadow {
  question!: Question;

  @property({ type: Number })
  lives!: number;

  connectedCallback() {
    super.connectedCallback();
    this.question = new questionKinds[
      Math.floor(Math.random() * questionKinds.length)
    ](this.lives);
  }

  render() {
    return html`${this.question}`;
  }
}

@customElement("x-fatality-indicator")
export class FatalityIndicator extends LitElementNoShadow {
  @property({ type: Number })
  lives!: number;

  render() {
    if (this.lives <= 1) {
      return html`<div
        class="bg-red-800 text-white text-bold w-fit py-1 px-4 rounded-full"
      >
        Only Chance
      </div>`;
    } else {
      return html``;
    }
  }
}

@customElement("x-option-selection")
export class OptionSelection extends LitElementNoShadow {
  @property({ type: Array<String> })
  choices!: string[];
  @property({ type: Number })
  correct!: number;
  @property({ type: Boolean })
  fatal: boolean = false;

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
        class="border-2 border-slate-300 rounded-[1em] px-4 w-full transition-colors hover:bg-slate-300 hover:text-slate-900"
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
                  detail: { fatal: this.fatal },
                }),
              ),
            500,
          );
        }}
        ${ref(button)}
      >
        ${choice}
      </button>`;
    });

    return html`
      <div class="flex flex-col items-center justify-center gap-2 m-2 min-w-64">
        ${choices}
      </div>
    `;
  }
}
