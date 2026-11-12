// Indicador de espera. É decorativo: o texto ao lado ("Carregando...", "Salvando...") é quem informa.
export function Spinner({ className = 'size-5' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 animate-spin rounded-full border-3 border-current border-r-transparent ${className}`}
    />
  );
}
