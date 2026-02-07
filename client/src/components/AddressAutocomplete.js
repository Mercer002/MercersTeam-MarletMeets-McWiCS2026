import { useMemo, useRef } from "react";
import { Autocomplete } from "@react-google-maps/api";
import { useGoogleMaps } from "./GoogleMapsProvider";

const MONTREAL_BOUNDS = {
  north: 45.6,
  south: 45.45,
  east: -73.45,
  west: -73.75,
};

function AddressAutocomplete({
  id,
  name,
  value,
  onChange,
  onSelect,
  className,
  placeholder,
  error,
}) {
  const { isLoaded, loadError } = useGoogleMaps();
  const autocompleteRef = useRef(null);

  const bounds = useMemo(() => {
    if (!isLoaded || typeof window === "undefined" || !window.google) return null;
    const sw = new window.google.maps.LatLng(MONTREAL_BOUNDS.south, MONTREAL_BOUNDS.west);
    const ne = new window.google.maps.LatLng(MONTREAL_BOUNDS.north, MONTREAL_BOUNDS.east);
    return new window.google.maps.LatLngBounds(sw, ne);
  }, [isLoaded]);

  const options = useMemo(() => {
    if (!bounds) {
      return {
        componentRestrictions: { country: "ca" },
        fields: ["formatted_address", "geometry"],
      };
    }
    return {
      bounds,
      strictBounds: true,
      componentRestrictions: { country: "ca" },
      fields: ["formatted_address", "geometry"],
    };
  }, [bounds]);

  const handleLoad = (autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const handlePlaceChanged = () => {
    const place = autocompleteRef.current?.getPlace();
    const formatted = place?.formatted_address || place?.name;
    if (formatted) {
      onSelect?.(formatted, place);
    }
  };

  if (!isLoaded || loadError) {
    return (
      <input
        id={id}
        name={name}
        className={className}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
      />
    );
  }

  return (
    <Autocomplete onLoad={handleLoad} onPlaceChanged={handlePlaceChanged} options={options}>
      <input
        id={id}
        name={name}
        className={className}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
      />
    </Autocomplete>
  );
}

export default AddressAutocomplete;
