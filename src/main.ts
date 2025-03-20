import data from "../data/countries.json";
import "./quiz.ts";
import { OPTION_COUNT } from "./quiz.ts";

export type Country = (typeof data.countries)[0];

type CountryFilter = (country: Country) => boolean;
type CountryComparibleFilter = (country: Country) => CountryFilter;

export const countriesWithCapitals = new Set(
  data.countries.filter((country) => country.capitals.length > 0),
);

export function shuffle<T>(arr: Array<T>): Array<T> {
  return arr
    .map((value) => ({ value, sort: Math.random() }))
    .toSorted((a, b) => a.sort - b.sort)
    .map((value) => value.value);
}

export function countryCorrectMatchesFilter(
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
