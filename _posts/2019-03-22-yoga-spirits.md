---
title: Postnatal / Women's Yoga Workshop
date: 2019-03-22 06:00:00 Z
categories:
- blog
layout: default
description: Recharge, relax and strengthen during this unique Postnatal / Women's Yoga and Pilates Workshop.
---

I'm once again collaborating with [Yoga Spirits][1] to provide a Post-natal Pilates class at a women's yoga workshop in Mobberley. It's a relax, recharge and strengthening workshop with exercises tailored exclusively for post natal recovery.

If you know anyone who might be interested please pass on the details: [Postnatal / Women’s Yoga Workshops][2].

## Date and Location

Saturday 23 March 2019, <time>13:30</time> to <time>16:00</time>.

<address>
    Rajar Cottages<br>
    Town Lane<br>
    Mobberley<br>
    WA16 7ER<br><br>
    <script type="application/ld+json">
    {
        "@context": "http://schema.org",
        "@type": "BusinessEvent",
        "name": "Wild About Pilates: Postnatal / Women's Yoga Workshop",
        "startDate": "2019-03-22T13:30+00:00",
        "location": {
            "@type": "EventVenue",
            "name": "Rajar Cottages",
            "address": {
                "@type": "PostalAddress",
                "addressCountry": "GB",
                "streetAddress": "Town Lane",
                "addressLocality": "Mobberley",
                "postalCode": "WA16 7ER",
                "addressRegion": "Knutsford, Cheshire"
            }
        },
        "description": "Recharge, relax and strengthen during this unique Postnatal / Women's Yoga and Pilates Workshop.",
        "endDate": "2019-03-22T16:00+00:00",
        "offers": {
            "@type": "Offer",
            "url": "https://www.wildaboutpilates.co.uk/blog/2019-03-22-yoga-spirits/",
            "price": "0",
            "priceCurrency": "GBP",
            "availability": "http://schema.org/InStock",
            "validFrom": "2019-03-22T13:30+00:00"
        },
        "performer": [
            {
                "@type": "Person",
                "name": "Chrissie Wild"
            },
            {
                "@type": "Person",
                "name": "Maryline Higham,"
            }
        ]
    }
    </script>
</address>

<div id="map"></div>

<script>
    function initMap() {
        var center = {lat: 53.3148702, lng: -2.3341137};
        var map = new google.maps.Map(document.getElementById('map'), {
            zoom: 15,
            center: center
        });

        var marker = new google.maps.Marker({
            map: map,
            position: center
        });

        var infowindow = new google.maps.InfoWindow();
        infowindow.setContent(
            '<div><strong>Rajar Cottages</strong><br>' +
            'Town Lane<br>' +
            'Mobberley<br>' +
            'Knutsford<br>' +
            'WA16 7ER.</div>'
        );

        google.maps.event.addListener(marker, 'click', function() {
            infowindow.open(map, this);
        });
    }
</script>
<script
    async defer
    src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDHKsSfywxuRsNDtl3oienUIoUWZtMO9EQ&amp;callback=initMap">
</script>

<a class="button" href="https://www.google.com/maps/search/?api=1&amp;query_place_id=ChIJ57yCOphTekgRELe0EXWaaHk&amp;query=Rajar+Cottages%2C+Town+Lane%2C+Mobberley%2C+Knutsford%2C+WA16 7ER">View on Google Maps</a>

[1]: https://yogaspirits.co.uk/
[2]: https://yogaspirits.co.uk/postnatal-yoga-workshops/
