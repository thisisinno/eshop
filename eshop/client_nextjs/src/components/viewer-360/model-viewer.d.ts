declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        poster?: string;
        "camera-controls"?: boolean;
        "auto-rotate"?: boolean;
      };
    }
  }
}
