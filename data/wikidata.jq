def process :
	.results.bindings | map({
		name: .countryLabel.value,
		population: .population.value | tonumber,
		code: .isoCode.value,
		headsOfState: .headsOfState.value | split("$DIVIDE$"),
		capitals: .capitals.value | split("$DIVIDE$"),
		divisions: .divisions.value | split("$DIVIDE$"),
		borderCountries: .borderCountries.value | split("$DIVIDE$"),
		flagImage: { uri: .flagImage.value },
		geo: { uri: .geo.value },
	});
