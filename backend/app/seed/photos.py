"""The photo pool for seeded listings.

Every id below was collected from Unsplash's free-licence search results on 2026-10-09
(https://unsplash.com/license) and is verified by `npm run seed -- --check-images`,
which requests each URL. Nothing here is invented, and nothing is copied into the
repository: listings store the URL only.
"""

_BASE = "https://images.unsplash.com/photo-"
_PARAMS = "?auto=format&fit=crop&w=1600&q=80"


def photo_url(photo_id: str) -> str:
    return f"{_BASE}{photo_id}{_PARAMS}"


# Cover photos: the outside of the place, by property type.
COVERS: dict[str, tuple[str, ...]] = {
    "house": (
        "1580587771525-78b9dba3b914",
        "1600596542815-ffad4c1539a9",
        "1748063578185-3d68121b11ff",
        "1706808849777-96e0d7be3bb7",
        "1513584684374-8bab748fbf90",
        "1628744448840-55bdb2497bd4",
        "1706164971309-fb4785fe6ceb",
        "1686164748506-4311ba437c24",
        "1591474200742-8e512e6f98f8",
        "1756706718604-ef4af3970e33",
        "1696237583261-029171ee31fa",
        "1570290870545-277c2f5ad465",
        "1568605115459-4b731184f961",
        "1480074568708-e7b720bb3f09",
    ),
    "apartment": (
        "1522708323590-d24dbb6b0267",
        "1502672260266-1c1ef2d93688",
        "1560448204-e02f11c3d0e2",
        "1628592102751-ba83b0314276",
        "1665249934445-1de680641f50",
        "1653972233229-1b8c042d6d8e",
        "1738168246881-40f35f8aba0a",
        "1554995207-c18c203602cb",
        "1560185009-5bf9f2849488",
        "1493809842364-78817add7ffb",
    ),
    "guesthouse": (
        "1560184897-ae75f418493e",
        "1726968335694-02219ed7ce96",
        "1603517432006-7127536be848",
        "1722480417302-03a8043389ac",
        "1659878291453-6ad8d74005cc",
        "1698077753887-7e44408b940b",
        "1613519627731-ab4595f7f1dc",
        "1565971988144-c8a2adc6eb1d",
        "1598228723793-52759bba239c",
        "1580202313707-46a966af5c6f",
    ),
    "cabin": (
        "1475087542963-13ab5e611954",
        "1583878594798-c31409c8ab4a",
        "1455789743510-55194918fe8d",
        "1502885380958-f9f2289af1a1",
        "1610486870542-70d0062d150f",
        "1574834749970-34c9a2c6d8a7",
        "1620656741839-b166cb7e3c54",
        "1639405791326-b1168dd7ad71",
        "1741789899140-ded49642c17d",
        "1600896186581-fe46923e546f",
        "1611849793043-e080fc18205e",
    ),
    "villa": (
        "1670589953882-b94c9cb380f5",
        "1622015663319-e97e697503ee",
        "1745761320791-5ae142edee8c",
        "1678889284769-b7dcbec1f082",
        "1598635031829-4bfae29d33eb",
        "1603034222368-fc53916f4eed",
        "1682502524896-6d78b9e8413a",
        "1777907604937-69219987431f",
        "1582610116397-edb318620f90",
        "1613977257363-707ba9348227",
        "1613977257592-4871e5fcd7c4",
        "1512917774080-9991f1c4c750",
        "1582268611958-ebfd161ef9cf",
        "1706808849780-7a04fbac83ef",
        "1693576588461-3ad3dd88371e",
        "1706164971302-e30c0640cc3b",
    ),
    "cottage": (
        "1588880331179-bc9b93a8cb5e",
        "1434082033009-b81d41d32e1c",
        "1590354893781-90ed27ce7ce9",
        "1579690602005-647035ff79c3",
        "1584738766473-61c083514bf4",
        "1688396538097-af54bb314ab6",
        "1587913560680-7f8187bf9634",
        "1654445112674-85c94a3eae7b",
        "1562182384-08115de5ee97",
        "1682516086739-c3fbf844529b",
        "1772365833604-850c93d327cb",
    ),
    "tiny-home": (
        "1668015642451-a3bb11afb441",
        "1628394029761-acc83a2a08a6",
        "1668015642564-1d68397e77a8",
        "1595525101922-d7febbdd796d",
        "1632252300695-97c54a0db8e4",
        "1697462247934-47afc5541494",
        "1589574097341-acd57bd79fde",
        "1724709865844-edc4f56c7745",
        "1724865437182-859b87d0d451",
    ),
    "treehouse": (
        "1618767689160-da3fb810aad7",
        "1604004218771-05c55db4f9f4",
        "1587913696806-280ef35f1e19",
        "1622968422538-efb01b75d5e8",
        "1633830902223-727413dfad8f",
        "1618767689159-1bfda407947b",
        "1744833467038-045ae9880cee",
        "1649281696706-66ac01e5ac3c",
        "1557443612-1d954d414d1c",
    ),
}

# The rest of a listing's gallery, in the order the rooms are shown.
_ROOM_PHOTOS: dict[str, tuple[str, ...]] = {
    "living": (
        "1724582586529-62622e50c0b3",
        "1600210492493-0946911123ea",
        "1633330977020-2bdfb8530cc2",
        "1613545325278-f24b0cae1224",
        "1628744876497-eb30460be9f6",
        "1600210491369-e753d80a41f3",
        "1688646953306-5ec93eab8c06",
        "1705321963943-de94bb3f0dd3",
        "1637649228998-6c78a67dfa6c",
        "1630699144035-c0f6311ec482",
        "1613545325268-9265e1609167",
        "1704040686510-b747ff423ebb",
        "1704040686413-2c607dbd2f06",
        "1631048501831-46856f9eaaf2",
        "1704040686428-7534b262d0d8",
        "1613685301586-4f2b15f0ccd4",
        "1666585958641-4f70887372a1",
        "1730989427568-0a6fdb5a2fb1",
        "1631679706909-1844bbd07221",
    ),
    "bedroom": (
        "1616486029423-aaa4789e8c9a",
        "1560185893-a55cbc8c57e8",
        "1595526114035-0d45ed16cfbf",
        "1566665797739-1674de7a421a",
        "1618221118493-9cfa1a1c00da",
        "1562438668-bcf0ca6578f0",
        "1598928636135-d146006ff4be",
        "1586105251261-72a756497a11",
        "1595526051245-4506e0005bd0",
        "1696762932825-2737db830bbe",
        "1611892440504-42a792e24d32",
        "1617104678098-de229db51175",
        "1600210491305-7396500b5b31",
        "1625334782252-da92af3ad887",
        "1720420021124-4e18564e070f",
        "1617099443741-a9b51eabd2b8",
        "1633948393301-d43e3ec0e5cd",
        "1512918728675-ed5a9ecdebfd",
        "1661351240151-fa45627490ef",
        "1631839686574-2497d4b71873",
        "1541004995602-b3e898709909",
    ),
    "kitchen": (
        "1484154218962-a197022b5858",
        "1602028915047-37269d1a73f7",
        "1632583824020-937ae9564495",
        "1507089947368-19c1da9775ae",
        "1588854337236-6889d631faa8",
        "1722605090433-41d1183a792d",
        "1556912173-3bb406ef7e77",
        "1591924450983-b8f7587ea332",
        "1512916194211-3f2b7f5f7de3",
        "1725905507743-30f903ebbf2c",
        "1649083048428-3d8ed23a3ce0",
        "1725905803121-dd123b058a5c",
        "1649083048391-1c9e82472f65",
        "1725257928373-dc6d2ac7b145",
        "1687946939402-a02bfa7af289",
        "1675279200694-8529c73b1fd0",
        "1702014862053-946a122b920d",
        "1689043528099-2ba014dd7c64",
    ),
    "bathroom": (
        "1584622650111-993a426fbf0a",
        "1631889993959-41b4e9c6e3c5",
        "1620626011761-996317b8d101",
        "1507652313519-d4e9174996dd",
        "1733426107854-ee00a25d72a7",
        "1742134131017-44d377a611b1",
        "1733425844220-feab971190ff",
        "1667550177753-52b318cd4d40",
        "1771681278369-e2a5480b8c29",
        "1776525433347-13ffc965601a",
        "1770941450515-50f2b8ca380b",
        "1770941550709-a555ac4a69b3",
        "1680209081088-645c22402d58",
        "1667550177726-96da7c257853",
        "1677553512940-f79af72efd1b",
    ),
    "dining": (
        "1617806118233-18e1de247200",
        "1505409628601-edc9af17fda6",
        "1602872030490-4a484a7b3ba6",
        "1723750290151-164cb19ebab7",
        "1633505412556-82c0921e8f4a",
        "1683735669803-2cf67a3edda5",
        "1745794621090-d856c53b0cc2",
        "1611596188718-840151555242",
        "1636138389529-d35a2a348dc1",
        "1560185007-cde436f6a4d0",
        "1658280024253-34cafdfbb002",
        "1537726235470-8504e3beef77",
        "1519643381401-22c77e60520e",
        "1713184355726-d3a31d822fcc",
        "1713365829670-d8df1e593248",
        "1635321350281-e2a91ecffd00",
        "1616486338812-3dadae4b4ace",
        "1618221469555-7f3ad97540d6",
    ),
    "outdoor": (
        "1560448205-d82bf18b9bcf",
        "1645587593689-e7cde7c5d9db",
        "1681971636852-de901b958b22",
        "1776363116182-51694a04a1d5",
        "1623097467856-7ad5379fe60e",
        "1714919286244-6f3f6cce6e65",
        "1609602126247-4ab7188b4aa1",
        "1758792930399-72b6a7989891",
        "1562239409-b5c79828df9e",
        "1786654026766-8c6422fcbb84",
        "1787868377879-98168d69cfe2",
        "1622015663381-d2e05ae91b72",
    ),
}

# A listing's cover is never used by another listing, as a cover or in a gallery. There
# are fewer outside views than listings, so some interior photos are set aside as covers
# (for flats, guesthouses and homes, whose cover is often a room) and taken out of the
# gallery pools.
_COVER_ROOMS = ("living", "bedroom", "kitchen", "dining")
_COVERS_PER_ROOM = 9
INTERIOR_COVERS: tuple[str, ...] = tuple(
    photo_id for room in _COVER_ROOMS for photo_id in _ROOM_PHOTOS[room][-_COVERS_PER_ROOM:]
)

# Gallery photos by room. They may repeat across listings, never within one.
ROOMS: dict[str, tuple[str, ...]] = {
    room: tuple(photo_id for photo_id in pool if photo_id not in INTERIOR_COVERS)
    for room, pool in _ROOM_PHOTOS.items()
}


def all_photo_urls() -> list[str]:
    """Every URL the seed can use, without duplicates, in a stable order."""
    ids = [photo_id for group in (*COVERS.values(), *_ROOM_PHOTOS.values()) for photo_id in group]
    return [photo_url(photo_id) for photo_id in dict.fromkeys(ids)]
