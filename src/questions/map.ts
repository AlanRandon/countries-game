import { html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { Map as MapLibreGl, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import mapStyle from "../map-style.json";
import { Country, countryCorrectMatchesFilter } from "../main.ts";
import { LitElementNoShadow, Question } from "./base.ts";

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

  // `any` feels vaguely ok as errors should lead to the destruction of this element
  dispatchFetchError(): any {
    this.dispatchEvent(new CustomEvent("fetch-error", { bubbles: true }));
  }

  async firstUpdated() {
    this.listener = (event) => this.keypress(event);
    document.addEventListener("keypress", this.listener);

    const mapData = await (
      await fetch(this.src).catch(() => this.dispatchFetchError())
    )
      .json()
      .catch(() => this.dispatchFetchError());

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
          "fill-color": "#fb923c",
          "fill-opacity": 0.7,
        },
      });
    });
  }

  render() {
    return html`<div class="map inset-0 w-full h-64 rounded-xl"></div>`;
  }
}

@customElement("x-locator-map-which-country")
export class MapIsWhichCountryQuestion extends Question {
  choices: Country[];
  correct: number;

  constructor(lives: number) {
    super(lives);

    const question = countryCorrectMatchesFilter(
      (country) => typeof country.geo.localUri === "string",
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
      </div>
      <div class="grid place-items-stretch w-full h-full">
        <x-map src=${src} @fetch-error=${() => this.dispatchSkip()}></x-map>
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
