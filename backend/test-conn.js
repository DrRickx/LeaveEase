// test-ips.js
import dns from "dns"
import net from "net"
const host = "aws-0-ap-southeast-2.pooler.supabase.com";

dns.resolve4(host, (err, ips) => {
	if (err) return console.log("dns error", err.code);
	console.log("IPs:", ips);
	ips.forEach((ip) => {
		const s = net.connect({ host: ip, port: 5432 });
		s.setTimeout(8000);
		s.on("connect", () => s.write(Buffer.from([0, 0, 0, 8, 4, 210, 22, 47])));
		s.on("data", (d) => { console.log(ip, "-> reply:", d.toString()); s.destroy(); });
		s.on("timeout", () => { console.log(ip, "-> NO REPLY"); s.destroy(); });
		s.on("error", (e) => console.log(ip, "-> error", e.code));
	});
});