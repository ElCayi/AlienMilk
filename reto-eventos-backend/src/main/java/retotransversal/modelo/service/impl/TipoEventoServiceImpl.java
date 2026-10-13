package retotransversal.modelo.service.impl;

import java.util.List;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import retotransversal.exception.ConflictoNegocioException;
import retotransversal.exception.RecursoNoEncontradoException;
import retotransversal.modelo.entities.TipoEvento;
import retotransversal.modelo.repository.EventoRepository;
import retotransversal.modelo.repository.TipoEventoRepository;
import retotransversal.modelo.service.ErroresCampos;
import retotransversal.modelo.service.TipoEventoService;

@Service
@RequiredArgsConstructor
public class TipoEventoServiceImpl implements TipoEventoService {

	private final TipoEventoRepository tipoEventoRepository;
	private final EventoRepository eventoRepository;

	@Override
	public TipoEvento findById(Integer id) {
		return tipoEventoRepository.findById(id)
				.orElseThrow(() -> new RecursoNoEncontradoException("Tipo de evento no encontrado"));
	}

	@Override
	public List<TipoEvento> findAll() {
		return tipoEventoRepository.findAll();
	}

	@Override
	public TipoEvento insertOne(TipoEvento entidad) {
		validar(entidad);
		return tipoEventoRepository.save(entidad);
	}

	@Override
	public TipoEvento updateOne(TipoEvento entidad) {
		findById(entidad.getIdTipo());
		validar(entidad);
		return tipoEventoRepository.save(entidad);
	}

	/** Un tipo con sesiones no se borra: dejaría esas sesiones sin tipo. */
	@Override
	public int deleteOne(Integer id) {
		findById(id);
		long sesiones = sesionesDe(id);
		if (sesiones > 0) {
			throw new ConflictoNegocioException(sesiones == 1
					? "Hay una sesión de este tipo: cámbiala de tipo antes de borrarlo"
					: "Hay %d sesiones de este tipo: cámbialas de tipo antes de borrarlo".formatted(sesiones));
		}
		tipoEventoRepository.deleteById(id);
		return 1;
	}

	@Override
	public long sesionesDe(Integer idTipo) {
		return eventoRepository.countByTipoEventoIdTipo(idTipo);
	}

	private void validar(TipoEvento tipo) {
		tipo.setNombre(ErroresCampos.limpio(tipo.getNombre()));
		tipo.setDescripcion(ErroresCampos.limpio(tipo.getDescripcion()));
		new ErroresCampos()
				.obligatorio("nombre", tipo.getNombre(), 45, "Escribe el nombre del tipo")
				.si(tipo.getNombre() != null && tipoEventoRepository.findByNombre(tipo.getNombre())
						.filter(otro -> !otro.getIdTipo().equals(tipo.getIdTipo())).isPresent(), "nombre",
						"Ya hay un tipo con ese nombre")
				.maximo("descripcion", tipo.getDescripcion(), 200)
				.lanzarSiHay();
	}
}
