package retotransversal.modelo.dto;

import java.util.List;

public record CatalogoTiendaDto(CondicionesTiendaDto condiciones, List<ProductoDto> productos) {
}
