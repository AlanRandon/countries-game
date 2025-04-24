def process :
	. | map({
		name: .countryLabel.value,
		id: .country.value | sub("http://www.wikidata.org/entity/"; ""),
		continents: .continents.value | split("$DIVIDE$") | map(select(. != "Australian continent")) | sort,
		population: .population.value | tonumber,
		code: .isoCode.value,
		headsOfGovernment: .headsOfGov.value | split("$DIVIDE$") | sort,
		capitals: .capitals.value | split("$DIVIDE$") | sort,
		divisions: .divisions.value | split("$DIVIDE$") | sort,
		borderCountries: .borderCountries.value | split("$DIVIDE$") | sort,
		flagImage: { uri: .flagImage.value },
		geo: { uri: .geo.value },
	}) | sort_by(.name);
