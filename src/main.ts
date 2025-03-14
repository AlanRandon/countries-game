import data from "../data/countries.json";
import { LitElement, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { Map as MapLibreGl, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import mapStyle from "./map-style.json";

class LitElementNoShadow extends LitElement {
  createRenderRoot() {
    return this;
  }
}

class Question extends LitElementNoShadow {
  lives: number;

  constructor(lives: number) {
    super();
    this.lives = lives;
  }
}

const MAX_LIVES = 3;

@customElement("x-map")
export class MapElement extends LitElementNoShadow {
  @query(".map")
  map!: HTMLElement;

  @property({ type: String })
  src!: string;

  mapInstance: MapLibreGl | undefined;
  listener!: (event: KeyboardEvent) => void;

  disconnectedCallback() {
    document.removeEventListener("keypress", this.listener);
    this.mapInstance?.remove();
  }

  keypress(event: KeyboardEvent) {
    if (this.mapInstance === undefined) {
      return;
    }

    function easing(t: number) {
      return t * (2 - t);
    }

    const deltaDistance = 100;
    const map = this.mapInstance;
    switch (event.key) {
      case "+":
        map.zoomIn();
        break;
      case "-":
        map.zoomOut();
        break;
      case "h":
        map.panBy([-deltaDistance, 0], {
          easing: easing,
        });
        break;
      case "j":
        map.panBy([0, deltaDistance], {
          easing: easing,
        });
        break;
      case "k":
        map.panBy([0, -deltaDistance], {
          easing: easing,
        });
        break;
      case "l":
        map.panBy([deltaDistance, 0], {
          easing: easing,
        });
        break;
    }
  }

  async firstUpdated() {
    this.listener = (event) => this.keypress(event);
    document.addEventListener("keypress", this.listener);

    const mapData = await (await fetch(this.src)).json();

    const map = new MapLibreGl({
      container: this.map,
      style: mapStyle as StyleSpecification,
      center: [mapData.longitude, mapData.latitude],
      zoom: Math.min(mapData.zoom, 12),
      attributionControl: { compact: true },
      doubleClickZoom: false,
    });

    this.mapInstance = map;

    map.on("dblclick", () => {
      map.easeTo({
        center: [mapData.longitude, mapData.latitude],
        zoom: Math.min(mapData.zoom, 12),
      });
    });

    map.on("load", () => {
      map.addSource("question-area", {
        type: "geojson",
        data: mapData.data,
        attribution: mapData.attribution || "Wikidata",
      });

      map.addLayer({
        id: "question-area",
        source: "question-area",
        type: "fill",
        paint: {
          "fill-outline-color": "transparent",
          "fill-color": "#3b82f6",
          "fill-opacity": 0.3,
        },
      });
    });
  }

  render() {
    return html` <div class="map min-w-64 aspect-square rounded-xl"></div>`;
  }
}

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

type Country = (typeof data.countries)[0];

type CountryFilter = (country: Country) => boolean;
type CountryComparibleFilter = (country: Country) => CountryFilter;

const hasCapital: CountryFilter = (country) => country.capitals.length > 0;

const requirementSets = {
  capitals: new Set(data.countries.filter(hasCapital)),
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
    </div>`;
  }
}

@customElement("x-country-which-capital")
export class CountryHasWhichCapitalQuestion extends Question {
  choices: Country[];
  correct: number;

  constructor(lives: number) {
    super(lives);

    this.choices = shuffle(Array.from(requirementSets.capitals)).slice(
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

@customElement("x-locator-map-which-country")
export class MapIsWhichCountryQuestion extends Question {
  choices: Country[];
  correct: number;

  constructor(lives: number) {
    super(lives);

    const question = countryCorrectMatchesFilter(
      (_country) => true,
      (_countryA) => (_countryB) => true,
    );
    this.choices = question.choices;
    this.correct = question.correct;
  }

  render() {
    const country = this.choices[this.correct];
    const src =
      import.meta.env.BASE_URL.replace(/\/$/, "") + country.geo.localUri;

    return html`<div class="grid place-items-center">
      <div
        class="grid place-items-center text-wrap max-w-100 text-center gap-2"
      >
        <span>Which country is found here?</span>
        <x-map src=${src}></x-map>
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
    // TODO: use local path to avoid cheating on flags
    const src =
      import.meta.env.BASE_URL.replace(/\/$/, "") + country.flagImage.localUri;

    return html`<div class="grid place-items-center">
      <div
        class="grid place-items-center text-wrap max-w-100 text-center gap-2"
      >
        <span>Which country has the following flag?</span>
        <img src="${src}" class="h-8" />
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
          if (country.code == correct.code) {
            return true;
          }

          return !country.borderCountries.includes(borderCountry!);
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

type QuestionConstructor = new (lives: number) => Question;
const questionKinds: QuestionConstructor[] = [
  CountryHasWhichCapitalQuestion,
  CaptialInWhichCountryQuestion,
  RegionInWhichCountryQuestion,
  CountryHasWhatPopulationQuestion,
  CountryWhichBordersQuestion,
  FlagOfWhichCountryQuestion,
  MapIsWhichCountryQuestion,
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
