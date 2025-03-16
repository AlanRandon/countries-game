def process_divisions(code) :
	if . then
		if code == "fo" then
			. | sub("^.* kommuna\\) "; "") | split(", ")
		elif code == "wf" then
			. | sub("^.* circonscription\\) "; "") | split(", ")
		elif code == "nc" then
			.
			| sub("^.*?; "; "")
			| split(",( and)? "; "g")
		elif code == "my" then
			. | split("; ") as $divisions
			| ($divisions[1] | split(", ") + ["Wilayah Persekutuan", "Kuala Lumpur", "Labuan", "Putrajaya"])
		elif code == "bk" then
			.
			| sub("; note ?- .*$"; "")
			| sub("^.*(- (?=[^\\)]*(?:\\(|$)))"; "")
			| split(", (?=[^\\)]*(?:\\(|$))"; "g")
		elif code == "mk" then
			.
			| sub("; note ?- .*$"; "")
			| sub("^.*([;:] (?=[^\\)]*(?:\\(|$)))"; "")
			| split(", (?=[^\\)]*(?:\\(|$))"; "g")
			| map(sub("^and |\\.$"; ""; "g"))
		elif code == "be" then
			. | sub("^.* gewest\\); "; "") | split("; ") | map(sub(", also known as .*"; ""))
		elif code == "en" then
			.
			| sub("^.*<strong>urban municipalities:</strong> "; "")
			| sub("<br /><br /><strong>rural municipalities:</strong>"; ",")
			| split(", ")
		elif code == "uk" then
			.
			| sub("<p><strong>(England|Scotland|Wales|Northern Ireland):</strong>.*?</p>"; ""; "g")
			| sub(" *<p><strong>.*?</strong> (?<list>.*?)</p> *"; "\(.list)SEPARATOR"; "g")
			| sub("SEPARATOR$"; "")
			| split("SEPARATOR") as $lists
			| (
				($lists[0] | split(", "))
				+ ($lists[1] | split(", "))
				+ ($lists[2] | split(", "))
				+ ($lists[3] | split("; "))
				+ ($lists[4] | split("; "))
				+ ($lists[5] | split("; "))
				+ ($lists[6] | split("; "))
				+ ($lists[7] | split(", "))
				+ ($lists[8] | split(", "))
			)
		elif code == "gg" then
			.
			| sub("^<p>.*?</p>"; "")
			| sub("; note - .* Mtskheta-Mtianeti"; "")
			| sub(" <p><strong>.*?</strong> (?<list>.*?)</p>"; "\(.list), "; "g")
			| sub("<strong>.*?</strong> *(?<list>.*)"; "\(.list),")
			| sub("(, *)+$"; "")
			| split(", ")
			| map(sub("^ +| +$"; ""; "g"))
		elif code == "ch" then
			.
			| sub("^<p>.*?</p>"; "")
			| sub(" <p><strong>.*?</strong> (?<list>.*?)</p>"; "\(.list), "; "g")
			| sub("<strong>.*?</strong> *(?<list>.*)"; "\(.list),")
			| sub("<br /><br />"; ", "; "g")
			| sub("(, *)+$"; "")
			| split(", ")
			| map(sub("^ +| +$|; \\(see note on Taiwan\\)"; ""; "g"))
		elif code == "uz" then
			.
			| sub("<span data-contrast=\\\"(none|auto)\\\">|</span>"; ""; "g")
			| sub(" <span data-ccp-props=\"{}\">&nbsp;</p>$"; "")
			| sub("^.*; "; "")
			| split(", ")
		elif . | contains("<strong>") then
			.
			| sub("^<p>.*?</p>"; "")
			| sub(" <p><strong>.*?</strong> (?<list>.*?)</p>"; "\(.list), "; "g")
			| sub("<strong>.*?</strong> *(?<list>.*)"; "\(.list),")
			| sub("(, *)+$"; "")
			| split(", ")
			| map(sub("^ +| +$"; ""; "g"))
		elif . | contains("none") then
			[]
		else
			.
			| sub("; note ?- .*$"; "")
			| sub("^.*([;:] (?=[^\\)]*(?:\\(|$)))"; "")
			| split(", (?=[^\\)]*(?:\\(|$))"; "g")
		end
	else [] end
	| map(sub("(\\*|//|;$)"; ""; "g"))
	| unique;

def process_capital : 
	if . and (. | startswith("no official") | not) then
		.
		| sub("(; note.*|is the.*|; located in.*|in Romanian.*| \\(Kiev.*?\\)| \\(.*?continues.*?\\)| \\(city\\)| \\(on.*?\\)| \\(located on.*?\\))"; ""; "g")
		| sub("Washington, DC"; "Washington DC")
		| sub("; "; ", "; "g")
		| split(",(?=[^\\)]*(?:\\(|$))"; "g")
	else [] end | map(sub("^ *| *$"; ""; "g"));

def get_media(media; item) :
	(media[]
	| select(.type == item).src
	| sub("/attachments"; "https://www.cia.gov/the-world-factbook/static")
	| { url: ., exists: true }) // { exists: false };

def process :
	(.categories[] | select(.id == "government").fields) as $gov
	| (.categories[] | select(.id == "geography").fields) as $geo
	| (.categories[] | select(.id == "people_and_society").fields) as $pns
	| ($gov[] | select(.name == "Country name").subfields[] | select(.name == "conventional short form").value) as $name
	| (.code | ascii_downcase) as $code
	| (.media // []) as $media
	| if
		$name != null
		and $name != "none"
		and $name != "Baker Island, Howland Island, Jarvis Island, Johnston Atoll, Kingman Reef, Midway Islands, Palmyra Atoll"
		and $name != "Dhekelia"
		and $name != "Akrotiri"
	then {
		capitals: (($gov[] | select(.name == "Capital").subfields[] | select(.name == "name").value | process_capital) // []),
		name: $name | sub(" \\(.*\\)"; ""; "g") | sub("&nbsp;$"; ""; "g"),
		code: $code,
		borderCountries: (($geo[] | (select(.name == "Land boundaries").subfields // [])[] | select(.name == "border countries").value) // null),
		population: ((($pns[] | (select(.name == "Population").subfields // [])[] | select(.name == "total").content)) // "unknown"),
		divisions: (($gov[] | select(.name == "Administrative divisions").value | process_divisions($code)) // []),
		media: {
			flag: get_media($media; "flag"),
			locatorMap: get_media($media; "locator-map"),
		},
	} else empty end;
