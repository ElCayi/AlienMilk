package retotransversal.modelo.service.impl;

import java.time.Year;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import retotransversal.modelo.dto.RedConfianzaDto;
import retotransversal.modelo.entities.CifraConfianza;
import retotransversal.modelo.entities.Premio;
import retotransversal.modelo.entities.Socio;
import retotransversal.modelo.repository.CifraConfianzaRepository;
import retotransversal.modelo.repository.PremioRepository;
import retotransversal.modelo.repository.SocioRepository;
import retotransversal.modelo.service.RedConfianzaService;

@Service
@RequiredArgsConstructor
public class RedConfianzaServiceImpl implements RedConfianzaService {

	private final PremioRepository premioRepository;
	private final SocioRepository socioRepository;
	private final CifraConfianzaRepository cifraRepository;

	@Override
	@Transactional(readOnly = true)
	public RedConfianzaDto obtener() {
		return RedConfianzaDto.builder()
				.premios(premioRepository.findByActivoTrueOrderByOrdenAsc().stream().map(this::premio).toList())
				.socios(socioRepository.findByActivoTrueOrderByOrdenAsc().stream().map(this::socio).toList())
				.cifras(cifraRepository.findAllByOrderByOrdenAsc().stream().map(this::cifra).toList())
				.build();
	}

	private RedConfianzaDto.Premio premio(Premio premio) {
		return RedConfianzaDto.Premio.builder()
				.sigla(premio.getSigla())
				.nombre(premio.getNombre())
				.otorgante(premio.getOtorgante())
				.fecha(premio.getFecha())
				.build();
	}

	private RedConfianzaDto.Socio socio(Socio socio) {
		return RedConfianzaDto.Socio.builder()
				.nombre(socio.getNombre())
				.estilo(socio.getEstilo())
				.emblema(socio.getEmblema())
				.build();
	}

	private RedConfianzaDto.Cifra cifra(CifraConfianza cifra) {
		return RedConfianzaDto.Cifra.builder()
				.clave(cifra.getClave())
				.rotulo(cifra.getRotulo())
				.valor(valor(cifra))
				.unidad(cifra.getUnidad())
				.nota(cifra.getNota())
				.build();
	}

	/** El valor que se muestra: el guardado o, si la cifra se calcula, el resultado. */
	private String valor(CifraConfianza cifra) {
		if (CifraConfianza.CALCULO_ANIOS_DESDE.equals(cifra.getCalculo())) {
			try {
				return String.valueOf(Year.now().getValue() - Integer.parseInt(cifra.getValor().trim()));
			} catch (NumberFormatException e) {
				return cifra.getValor();
			}
		}
		return cifra.getValor();
	}
}
