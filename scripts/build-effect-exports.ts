import { build } from 'esbuild';
import type { EffectMetadata } from '@motion-graphics/core';
import ts from 'typescript';

export interface EffectExportManifestEntry {
  format: 'tsx';
  source: string;
  exportName: string;
  externalDependencies: string[];
  requiredAssets: string[];
  requiresManualSetup: boolean;
}

function packageName(specifier: string): string {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function keywordType(type: 'string' | 'number' | 'boolean'): ts.KeywordTypeNode {
  if (type === 'string') return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
  if (type === 'number') return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
  return ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
}

function propertyType(property: EffectMetadata['properties'][number]): ts.TypeNode {
  const factory = ts.factory;
  if (property.type === 'enum' && property.options?.length) {
    return factory.createUnionTypeNode(
      property.options.map((option) => factory.createLiteralTypeNode(factory.createStringLiteral(option))),
    );
  }
  if (property.type === 'array') {
    if (property.items?.type === 'object') {
      const members = Object.entries(property.items.properties ?? {}).map(([name, type]) =>
        factory.createPropertySignature(
          undefined,
          factory.createIdentifier(name),
          (property.items?.required ?? []).includes(name)
            ? undefined
            : factory.createToken(ts.SyntaxKind.QuestionToken),
          keywordType(type),
        ),
      );
      return factory.createArrayTypeNode(factory.createTypeLiteralNode(members));
    }
    const itemType =
      property.items?.type === 'string'
        ? factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
        : property.items?.type === 'number'
          ? factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)
          : factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
    return factory.createArrayTypeNode(itemType);
  }

  const keyword =
    property.type === 'string' || property.type === 'enum'
      ? ts.SyntaxKind.StringKeyword
      : property.type === 'number'
        ? ts.SyntaxKind.NumberKeyword
        : ts.SyntaxKind.BooleanKeyword;
  return factory.createKeywordTypeNode(keyword);
}

function addExportPropsType(source: string, effect: EffectMetadata): string {
  const sourceFile = ts.createSourceFile('effect.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const factory = ts.factory;
  const component = sourceFile.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) && statement.name?.text === effect.exportName,
  );
  if (!component) {
    throw new Error(`${effect.id} export must define ${effect.exportName} as a named function declaration.`);
  }
  const propsParameter = component.parameters[0];
  if (!propsParameter || !ts.isObjectBindingPattern(propsParameter.name)) {
    throw new Error(`${effect.id} export must destructure its component props in the first parameter.`);
  }

  const propsTypeName = `${effect.exportName}Props`;
  const propsType = factory.createInterfaceDeclaration(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    propsTypeName,
    undefined,
    undefined,
    effect.properties.map((property) =>
      factory.createPropertySignature(
        undefined,
        factory.createStringLiteral(property.name),
        property.required ? undefined : factory.createToken(ts.SyntaxKind.QuestionToken),
        propertyType(property),
      ),
    ),
  );
  const typedParameter = factory.updateParameterDeclaration(
    propsParameter,
    propsParameter.modifiers,
    propsParameter.dotDotDotToken,
    propsParameter.name,
    propsParameter.questionToken,
    factory.createTypeReferenceNode(propsTypeName),
    propsParameter.initializer,
  );
  const typedComponent = factory.updateFunctionDeclaration(
    component,
    component.modifiers,
    component.asteriskToken,
    component.name,
    component.typeParameters,
    [typedParameter, ...component.parameters.slice(1)],
    component.type,
    component.body,
  );
  const statements = sourceFile.statements.map((statement) => (statement === component ? typedComponent : statement));
  const componentIndex = statements.indexOf(typedComponent);
  statements.splice(componentIndex, 0, propsType);
  const typedSource = factory.updateSourceFile(sourceFile, statements);
  return ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(typedSource);
}

export async function buildEffectExport(
  effect: EffectMetadata,
  sourcePath: string,
): Promise<{ source: string; manifest: EffectExportManifestEntry }> {
  const result = await build({
    entryPoints: [sourcePath],
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'esm',
    packages: 'external',
    jsx: 'preserve',
    outfile: 'effect.tsx',
    metafile: true,
  });

  if (result.outputFiles.length !== 1) {
    throw new Error(`${effect.id} export must produce exactly one standalone TSX file.`);
  }

  const output = Object.values(result.metafile.outputs).find((item) => item.entryPoint);
  if (!output || !output.exports.includes(effect.exportName)) {
    throw new Error(`${effect.id} source must export ${effect.exportName} as a named component.`);
  }

  const externalImports = [
    ...new Set(output.imports.filter((item) => item.external).map((item) => packageName(item.path))),
  ].sort();
  const undeclaredDependencies = externalImports.filter((dependency) => !effect.dependencies.includes(dependency));
  if (undeclaredDependencies.length > 0) {
    throw new Error(`${effect.id} export uses undeclared external dependencies: ${undeclaredDependencies.join(', ')}.`);
  }

  const dependencies = [...new Set(effect.dependencies)].sort();
  const installCommand =
    dependencies.length > 0 ? `pnpm add ${dependencies.join(' ')}` : 'No external packages are required.';
  const componentUsage = `<${effect.exportName} />`;
  const header = [
    '/**',
    ` * Standalone Remotion effect: ${effect.name}.`,
    ` * Source: ${effect.id}/${effect.entry.replace(/^\.\//, '')}.`,
    ` * Install dependencies: ${installCommand}`,
    ` * Use inside a Remotion composition: ${componentUsage}`,
    ' * The component implementation below is generated from the original effect source.',
    ' */',
    '',
  ].join('\n');
  const typedSource = addExportPropsType(result.outputFiles[0].text, effect);

  return {
    source: `${header}${typedSource}`,
    manifest: {
      format: 'tsx',
      source: `packages/effects/${effect.id}/${effect.entry.replace(/^\.\//, '')}`,
      exportName: effect.exportName,
      externalDependencies: dependencies,
      requiredAssets: [],
      requiresManualSetup: false,
    },
  };
}
