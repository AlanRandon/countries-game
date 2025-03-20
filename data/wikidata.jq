def process :
	. | map({
		name: .countryLabel.value,
		id: .country.value | sub("http://www.wikidata.org/entity/"; ""),
		population: .population.value | tonumber,
		code: .isoCode.value,
		headsOfGovernment: .headsOfGov.value | split("$DIVIDE$"),
		capitals: .capitals.value | split("$DIVIDE$"),
		divisions: .divisions.value | split("$DIVIDE$"),
		borderCountries: .borderCountries.value | split("$DIVIDE$"),
		flagImage: { uri: .flagImage.value },
		geo: { uri: .geo.value },
	});
