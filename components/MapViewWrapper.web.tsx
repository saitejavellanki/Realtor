import React from "react";
import { View } from "react-native";

const MapView = React.forwardRef<any, any>(({ style, children }, ref) => (
  <View ref={ref} style={[{ backgroundColor: "#e5e7eb" }, style]}>{children}</View>
));
MapView.displayName = "MapView";

export default MapView;
export const Marker: React.FC<any> = () => null;
export const PROVIDER_DEFAULT = undefined as any;
