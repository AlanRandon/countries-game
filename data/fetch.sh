#!/usr/bin/env sh

process() {
	fd ".*\.json" data/cache.factbook.json \
		| while read f; do jq . $f; done \
		| jq -s 'import "data/fetch" as fetch; { countries: [.[] | fetch::process] }' >data/countries.json

	echo {} >data/media-checksums.json
	codes=$(jq -r '.countries[] | .code' data/countries.json)
	for code in $codes; do
		for media in $(jq -c ".countries[] | select(.code == \"$code\").media | to_entries | map(. // empty) []" data/countries.json); do
			url=$(echo $media | jq -r .value.url)
			name_hash=$(echo $url | sha256sum | cut -d' ' -f1)
			name=$name_hash.jpg

			if [ "$(echo $media | jq -r .value.exists)" = "true" ]; then
				fetch() {
					echo Fetching: $url
					curl -Lfso public/static/$name $url
				}

				[ ! -f public/static/$name ] && fetch
				key=$(echo $media | jq -r .key)
				if [ "$key" = "locatorMap" ] && [ ! -f public/static/$name_hash-processed.jpg ]; then
					echo Processing map: $code
					ffmpeg \
						-y \
						-i public/static/$name \
						-filter_complex "[0]colorkey=white:0.1:0.5[ckout];color=c=1e293b,format=rgba[bg];[bg][0]scale2ref=w=iw:h=ih[bg][0];[bg][ckout]overlay=(W-w)/2:(H-h)/2[out]" \
						-map [out] \
						-frames:v 1 \
						-hide_banner -loglevel error \
						public/static/$name_hash-processed.jpg
				fi

				image_hash=$(sha256sum public/static/$name | cut -d' ' -f1)
				cat <<<$(jq ".countries |= map(select(.code == \"$code\").media[\"$key\"] *= {
					localUrl: \"/static/$(if [ "$key" = "locatorMap" ]; then
						echo $name_hash-processed.jpg
					else
						echo $name
					fi)\",
					hash: \"$image_hash\"
				})" data/countries.json) >data/countries.json
			fi
		done
	done
}

[ ! -d data ] && mkdir data
[ ! -d data/cache.factbook.json ] && git clone https://github.com/factbook/cache.factbook.json data/cache.factbook.json
[ ! -f data/countries.json ] && process
