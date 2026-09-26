package retotransversal.modelo.service;

import retotransversal.modelo.dto.ContactoPayloadDto;
import retotransversal.modelo.entities.Contacto;

public interface ContactoService {

	Contacto obtener();

	Contacto actualizar(ContactoPayloadDto datos, String username);
}
