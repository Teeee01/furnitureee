import { DEG } from "../geometry";
import { MAT } from "../materials";
import { model, part } from "../furniture/merge";

/* An open laptop. Local: the user sits at +z, the screen hinge is at -z,
 * the origin is on the desk surface. */
export function Laptop() {
  const meshes = model("laptop", () => {
    const tilt = -(104 * DEG - Math.PI / 2);
    // The lid hinges at (y 0.012, z -0.115); place its parts around that hinge.
    const lid = (y: number, z: number): [number, number, number] => [
      0,
      0.012 + y * Math.cos(tilt) - z * Math.sin(tilt),
      -0.115 + y * Math.sin(tilt) + z * Math.cos(tilt),
    ];
    return [
      part.box([0.33, 0.014, 0.23], [0, 0.007, 0], MAT.charcoalLight),
      part.box([0.28, 0.002, 0.1], [0, 0.015, -0.03], MAT.charcoalDark),
      part.box([0.33, 0.22, 0.01], lid(0.11, 0), MAT.charcoalLight, [tilt, 0, 0]),
      part.box([0.3, 0.19, 0.002], lid(0.112, 0.006), MAT.charcoalDark, [tilt, 0, 0]),
    ];
  });
  return (
    <>
      {meshes.map((m, i) => (
        <mesh key={i} geometry={m.geometry} material={m.material} receiveShadow />
      ))}
    </>
  );
}
